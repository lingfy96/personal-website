# -*- coding: utf-8 -*-
"""
图片优化脚本：为项目媒体资源生成 WebP 版本，并导出尺寸清单（用于 width/height 防 CLS）。

用法：
    python scripts/optimize_images.py

产出：
    - 同名 .webp 文件，与原图放在同一目录（原图保留作为 <picture> 降级源）
    - assets/image-manifest.json：{ "相对路径": { "w": 宽, "h": 高 } }
"""
import json
import os
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent

# (目录, 生成 WebP 的最大边宽, 质量)
TARGETS = [
    ("assets/certificates/ai", 1100, 82),   # 证书墙：移动端 ~260px，灯箱 ~1100px 足够
    ("assets/photo/ppt",        1600, 82),   # PPT 画廊：全屏查看需要较高分辨率
    ("assets/photo/ppt/课堂展示", 1400, 82),
    ("assets/map",              1400, 82),
    ("game/tank-battle",        1000, 80),   # 游戏封面：卡片展示位最高约 500px
]

# 单文件特例：(相对路径, 最大边宽, 质量)
SINGLES = [
    ("assets/photo/avatar.png", 640,  86),   # 头像：圆形展示位最大 160px
    ("assets/photo/moon.jpg",   1024, 85),   # 月球贴图：WebGL 纹理 1024 足够
]

EXTS = {".jpg", ".jpeg", ".png"}
SKIP_SUFFIX = (".webp",)


def convert(src: Path, max_side: int, quality: int):
    """生成 WebP，返回 (输出路径, 宽, 高, 原大小, 新大小) 或 None"""
    out = src.with_suffix(".webp")
    if src.suffix.lower() in SKIP_SUFFIX:
        return None

    with Image.open(src) as im:
        im.load()
        w, h = im.size

        # 统一色彩模式，避免 CMYK / P 模式转 WebP 报错
        if im.mode in ("RGBA", "LA", "P"):
            if im.mode == "P":
                im = im.convert("RGBA")
            has_alpha = True
        elif im.mode in ("CMYK", "YCbCr"):
            im = im.convert("RGB")
            has_alpha = False
        else:
            has_alpha = False

        # 等比缩放
        if max(w, h) > max_side:
            ratio = max_side / max(w, h)
            nw, nh = max(1, int(w * ratio)), max(1, int(h * ratio))
            im = im.resize((nw, nh), Image.LANCZOS)
            w, h = nw, nh

        save_kwargs = {"format": "WEBP", "quality": quality, "method": 6}
        if has_alpha:
            save_kwargs["lossless"] = False
            save_kwargs["alpha_quality"] = 90
        im.save(out, **save_kwargs)

    old = src.stat().st_size
    new = out.stat().st_size
    # 若 WebP 反而更大，删掉它，继续用原图
    if new >= old:
        out.unlink(missing_ok=True)
        return None
    return out, w, h, old, new


def main():
    # Windows 控制台编码兜底
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

    manifest = {}
    total_old = 0
    total_new = 0
    done = 0
    skipped = 0

    jobs = []
    for rel_dir, max_side, q in TARGETS:
        d = ROOT / rel_dir
        if not d.is_dir():
            print(f"[skip] 目录不存在: {rel_dir}")
            continue
        for f in sorted(d.iterdir()):
            if f.is_file() and f.suffix.lower() in EXTS:
                jobs.append((f, max_side, q))

    for rel, max_side, q in SINGLES:
        f = ROOT / rel
        if f.is_file():
            jobs.append((f, max_side, q))
        else:
            print(f"[skip] 文件不存在: {rel}")

    print(f"待处理: {len(jobs)} 个文件\n" + "-" * 68)

    for src, max_side, q in jobs:
        rel = src.relative_to(ROOT).as_posix()
        try:
            r = convert(src, max_side, q)
        except Exception as e:
            print(f"[fail] {rel}: {e}")
            skipped += 1
            continue

        if r is None:
            # 未生成 WebP（已存在或体积无收益），仍记录原图尺寸
            try:
                with Image.open(src) as im:
                    manifest[rel] = {"w": im.width, "h": im.height}
            except Exception:
                pass
            skipped += 1
            continue

        out, w, h, old, new = r
        manifest[rel] = {"w": w, "h": h}
        manifest[out.relative_to(ROOT).as_posix()] = {"w": w, "h": h}
        total_old += old
        total_new += new
        done += 1
        pct = (1 - new / old) * 100
        print(f"[ok]   {rel:<58} {old/1024:7.0f}KB -> {new/1024:6.0f}KB  (-{pct:4.1f}%)")

    print("-" * 68)
    print(f"生成 WebP: {done} 个 | 跳过: {skipped} 个")
    if total_old:
        saved = (1 - total_new / total_old) * 100
        print(f"体积合计: {total_old/1024/1024:.2f}MB -> {total_new/1024/1024:.2f}MB  (-{saved:.1f}%)")

    mf = ROOT / "assets" / "image-manifest.json"
    mf.parent.mkdir(parents=True, exist_ok=True)
    mf.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n尺寸清单已写入: {mf.relative_to(ROOT).as_posix()} ({len(manifest)} 条)")


if __name__ == "__main__":
    main()
