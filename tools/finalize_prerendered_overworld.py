from __future__ import annotations

import math
import re
import shutil
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
ASSET_ROOT = ROOT / "assets/overworld"
MAP_ROOT = ASSET_ROOT / "bosque-luminal"
CHAR_ROOT = ASSET_ROOT / "characters"
SRC_ROOT = ROOT / "src/overworld"
MAP_FILE = SRC_ROOT / "maps/bosque-luminal.js"

MAP_ROOT.mkdir(parents=True, exist_ok=True)
(CHAR_ROOT / "hero-male").mkdir(parents=True, exist_ok=True)
(CHAR_ROOT / "hero-female").mkdir(parents=True, exist_ok=True)
(CHAR_ROOT / "npcs").mkdir(parents=True, exist_ok=True)

for temporary in ROOT.rglob("*.b64-test"):
    temporary.unlink()

WORLD = (-38.0, 38.0, -31.0, 31.0)
SIZE = (1024, 832)
W, H = SIZE


def px(x: float) -> int:
    min_x, max_x, _, _ = WORLD
    return round((x - min_x) / (max_x - min_x) * (W - 1))


def py(z: float) -> int:
    _, _, min_z, max_z = WORLD
    return round((max_z - z) / (max_z - min_z) * (H - 1))


def poly(draw: ImageDraw.ImageDraw, points, fill, outline=None, width=1):
    pts = [(round(x), round(y)) for x, y in points]
    draw.polygon(pts, fill=fill)
    if outline:
        draw.line(pts + [pts[0]], fill=outline, width=width, joint="curve")


def ellipse(draw, box, fill, outline=None, width=1):
    box = tuple(round(v) for v in box)
    draw.ellipse(box, fill=fill, outline=outline, width=width)


def rect(draw, box, fill, outline=None, width=1):
    box = tuple(round(v) for v in box)
    draw.rectangle(box, fill=fill, outline=outline, width=width)


def deterministic_ground() -> tuple[Image.Image, Image.Image, Image.Image, Image.Image, Image.Image]:
    ground = Image.new("RGBA", SIZE, (39, 91, 55, 255))
    gd = ImageDraw.Draw(ground)
    foreground = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    fd = ImageDraw.Draw(foreground)
    shadows = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadows)
    collision = Image.new("L", SIZE, 0)
    cd = ImageDraw.Draw(collision)
    depth = Image.new("L", SIZE, 0)
    dd = ImageDraw.Draw(depth)

    # Grass base: hand-authored deterministic clusters, no noise.
    palette = [(44, 103, 61, 255), (50, 115, 66, 255), (35, 84, 51, 255), (64, 128, 72, 255)]
    tile = 16
    for ty in range(0, H, tile):
        for tx in range(0, W, tile):
            idx = ((tx // tile) * 3 + (ty // tile) * 5 + ((tx // tile) ^ (ty // tile))) % len(palette)
            gd.rectangle((tx, ty, tx + tile - 1, ty + tile - 1), fill=palette[idx])
            if (tx // tile + ty // tile) % 4 == 0:
                gd.rectangle((tx + 3, ty + 5, tx + 5, ty + 10), fill=(83, 145, 78, 255))
                gd.rectangle((tx + 7, ty + 7, tx + 9, ty + 12), fill=(30, 77, 47, 255))

    # Main road and bifurcation.
    road = [(0, -31), (-1, -22), (0, -14), (-2, -7), (1, 1), (0, 9), (1, 17), (0, 26), (0, 31)]
    road_px = [(px(x), py(z)) for x, z in road]
    gd.line(road_px, fill=(112, 83, 54, 255), width=88, joint="curve")
    gd.line(road_px, fill=(155, 119, 73, 255), width=70, joint="curve")
    gd.line(road_px, fill=(177, 139, 85, 255), width=42, joint="curve")
    branch = [(0, -5), (-7, -2), (-15, 0), (-23, 2)]
    branch_px = [(px(x), py(z)) for x, z in branch]
    gd.line(branch_px, fill=(112, 83, 54, 255), width=70, joint="curve")
    gd.line(branch_px, fill=(161, 124, 76, 255), width=52, joint="curve")
    for i in range(38):
        x = px(-2 + ((i * 11) % 43) / 2.7)
        y = py(-27 + ((i * 17) % 55))
        gd.rectangle((x, y, x + 5 + i % 4, y + 3 + (i * 3) % 4), fill=(116, 91, 67, 255))

    # Lake and shore.
    lake_center = (px(-23), py(-8))
    lake_box = (lake_center[0] - 122, lake_center[1] - 92, lake_center[0] + 118, lake_center[1] + 88)
    ellipse(gd, (lake_box[0]-18, lake_box[1]-14, lake_box[2]+18, lake_box[3]+14), (91, 115, 76, 255))
    ellipse(gd, lake_box, (48, 129, 137, 255), (31, 86, 95, 255), 6)
    for i in range(16):
        yy = lake_box[1] + 18 + i * 9
        gd.line((lake_box[0] + 26 + (i % 3) * 8, yy, lake_box[2] - 22 - (i % 4) * 7, yy), fill=(86, 178, 170, 255), width=3)
    cd.ellipse(lake_box, fill=255)

    # Houses: lower walls in ground, roofs in foreground.
    houses = [(-13, 4, "red"), (13, 6, "blue")]
    for hx, hz, accent in houses:
        cx, cy = px(hx), py(hz)
        wall = (235, 211, 161, 255) if accent == "red" else (220, 223, 190, 255)
        roof = (139, 62, 49, 255) if accent == "red" else (73, 108, 139, 255)
        roof_hi = (190, 91, 62, 255) if accent == "red" else (109, 151, 178, 255)
        ellipse(sd, (cx-78, cy+22, cx+86, cy+72), (22, 39, 33, 115))
        rect(gd, (cx-67, cy-19, cx+67, cy+56), wall, (75, 52, 39, 255), 5)
        rect(gd, (cx-17, cy+12, cx+17, cy+56), (91, 55, 38, 255), (48, 35, 29, 255), 4)
        for wx in (-43, 43):
            rect(gd, (cx+wx-13, cy+2, cx+wx+13, cy+25), (88, 182, 185, 255), (65, 51, 39, 255), 4)
            gd.line((cx+wx, cy+3, cx+wx, cy+24), fill=(229, 221, 171, 255), width=2)
        poly(fd, [(cx-82, cy-20), (cx, cy-88), (cx+82, cy-20), (cx+67, cy+12), (cx-67, cy+12)], roof, (61, 39, 34, 255), 6)
        fd.line((cx-62, cy-25, cx, cy-73, cx+62, cy-25), fill=roof_hi, width=7, joint="curve")
        rect(fd, (cx+35, cy-73, cx+53, cy-32), (91, 78, 68, 255), (45, 39, 35, 255), 3)
        for fx in (-78, 78):
            ellipse(gd, (cx+fx-12, cy+39, cx+fx+12, cy+61), (61, 126, 67, 255))
            for oy, col in [(0, (237, 188, 74, 255)), (8, (224, 105, 119, 255))]:
                ellipse(gd, (cx+fx-4, cy+43+oy, cx+fx+5, cy+52+oy), col)
        cd.rectangle((cx-70, cy-29, cx+70, cy+60), fill=255)
        dd.polygon([(cx-84, cy-90), (cx+84, cy-90), (cx+84, cy+16), (cx-84, cy+16)], fill=255)

    # Trees around bounds and visual clusters.
    trees = []
    for x in range(-36, 37, 5):
        trees.append((x, 29 - (abs(x) % 3), (x // 5) % 4))
        trees.append((x, -29 + (abs(x+2) % 3), (x // 5 + 2) % 4))
    for z in range(-24, 27, 5):
        trees.append((-35 + (abs(z) % 2), z, (z // 5 + 1) % 4))
        trees.append((35 - (abs(z+1) % 2), z, (z // 5 + 3) % 4))
    trees += [(-22, 12, 2), (-17, 17, 0), (19, 16, 3), (25, 10, 1), (-27, -20, 1), (24, -18, 2), (17, -12, 0), (-13, -15, 3)]
    leaf_sets = [((48, 116, 58, 255), (78, 151, 67, 255)), ((34, 95, 53, 255), (63, 134, 67, 255)), ((44, 91, 55, 255), (85, 140, 68, 255)), ((39, 112, 79, 255), (79, 176, 117, 255))]
    for tx, tz, variant in trees:
        cx, cy = px(tx), py(tz)
        scale = 0.84 + (variant % 3) * 0.08
        trunk_w = round(16 * scale)
        ellipse(sd, (cx-42, cy+8, cx+46, cy+38), (17, 38, 29, 125))
        poly(gd, [(cx-trunk_w, cy+31), (cx-trunk_w+3, cy-23), (cx+trunk_w-2, cy-25), (cx+trunk_w, cy+31)], (91, 59, 39, 255), (48, 40, 31, 255), 3)
        gd.line((cx-8, cy-18, cx-11, cy+25), fill=(148, 94, 54, 255), width=4)
        colors = leaf_sets[variant % 4]
        canopy_y = cy - 57
        blobs = [(-31, 8, 35), (0, -5, 43), (34, 8, 34), (-14, -30, 31), (21, -27, 29)]
        for bx, by, rr in blobs:
            ellipse(fd, (cx+bx-rr, canopy_y+by-rr, cx+bx+rr, canopy_y+by+rr), colors[(bx+by) % 2], (25, 60, 42, 255), 3)
        for k in range(8):
            lx = cx - 39 + (k * 19) % 77
            ly = canopy_y - 35 + (k * 23) % 68
            rect(fd, (lx, ly, lx+8, ly+6), (104, 180, 91, 255))
        cd.ellipse((cx-24, cy-17, cx+24, cy+35), fill=255)
        dd.ellipse((cx-73, canopy_y-70, cx+75, canopy_y+65), fill=255)

    # Fences, signs, flowers and tall grass.
    for side in (-1, 1):
        for i in range(8):
            x = side * (8 + i * 2.3)
            z = -5 + (i % 2) * .4
            cx, cy = px(x), py(z)
            rect(gd, (cx-4, cy-22, cx+4, cy+20), (97, 62, 39, 255), (53, 42, 31, 255), 2)
            if i < 7:
                nx = px(side * (8 + (i+1)*2.3))
                gd.line((cx, cy-11, nx, cy-11), fill=(124, 80, 46, 255), width=5)
                gd.line((cx, cy+6, nx, cy+6), fill=(83, 57, 39, 255), width=4)
    for sx, sz in [(-4, -21), (5, 13)]:
        cx, cy = px(sx), py(sz)
        rect(gd, (cx-4, cy-2, cx+4, cy+32), (92, 57, 35, 255))
        rect(gd, (cx-25, cy-23, cx+25, cy+6), (143, 98, 56, 255), (61, 44, 33, 255), 3)
    for group_x, group_z in [(-19, -17), (18, -9)]:
        for i in range(36):
            gx = group_x + ((i * 7) % 16) - 8
            gz = group_z + ((i * 11) % 10) - 5
            cx, cy = px(gx), py(gz)
            h = 8 + (i % 4) * 3
            gd.line((cx, cy, cx-3+(i%3)*3, cy-h), fill=(33, 99, 51, 255), width=3)
            gd.line((cx+2, cy, cx+5-(i%2)*4, cy-h+2), fill=(71, 145, 66, 255), width=3)
    for i in range(75):
        fx = -31 + ((i * 19) % 63)
        fz = -26 + ((i * 23) % 52)
        if abs(fx) < 5 or (fx < -12 and -15 < fz < 7) or (fx > 8 and -12 < fz < 12):
            continue
        cx, cy = px(fx), py(fz)
        col = [(242, 194, 80, 255), (219, 111, 139, 255), (119, 164, 232, 255)][i % 3]
        gd.line((cx, cy, cx, cy-8), fill=(41, 106, 50, 255), width=2)
        ellipse(gd, (cx-4, cy-12, cx+5, cy-4), col)

    # Gate and altar.
    gcx, gcy = px(0), py(27)
    ellipse(sd, (gcx-90, gcy+15, gcx+90, gcy+55), (16, 36, 30, 145))
    for side in (-1, 1):
        x = gcx + side * 55
        poly(gd, [(x-18, gcy+38), (x-12, gcy-61), (x+14, gcy-67), (x+22, gcy+38)], (91, 60, 42, 255), (48, 39, 31, 255), 5)
        for r in range(3):
            gd.line((x, gcy-50+r*20, gcx+side*8, gcy-76-r*4), fill=(124, 82, 49, 255), width=7)
    fd.arc((gcx-72, gcy-107, gcx+72, gcy+14), 190, 350, fill=(91, 60, 42, 255), width=20)
    fd.arc((gcx-68, gcy-101, gcx+68, gcy+8), 190, 350, fill=(143, 91, 52, 255), width=7)
    for side in (-1, 1):
        ellipse(fd, (gcx+side*48-10, gcy-61, gcx+side*48+11, gcy-40), (92, 229, 202, 255), (34, 92, 84, 255), 3)
    cd.rectangle((gcx-72, gcy-70, gcx+72, gcy+42), fill=255)
    dd.ellipse((gcx-78, gcy-110, gcx+78, gcy+20), fill=255)

    acx, acy = px(22), py(19)
    ellipse(sd, (acx-48, acy+10, acx+50, acy+39), (16, 35, 32, 130))
    poly(gd, [(acx-42, acy+24), (acx-31, acy-7), (acx+31, acy-7), (acx+43, acy+24)], (92, 102, 92, 255), (47, 58, 55, 255), 4)
    poly(fd, [(acx, acy-67), (acx-20, acy-19), (acx, acy-4), (acx+20, acy-19)], (92, 231, 211, 235), (211, 255, 241, 255), 3)
    dd.ellipse((acx-28, acy-72, acx+28, acy+4), fill=200)

    return ground, foreground, shadows, collision, depth


def save_assets():
    ground, foreground, shadows, collision, depth = deterministic_ground()
    ground.save(MAP_ROOT / "ground.webp", "WEBP", lossless=True, method=6)
    foreground.save(MAP_ROOT / "foreground.webp", "WEBP", lossless=True, method=6)
    shadows.save(MAP_ROOT / "shadows.webp", "WEBP", lossless=True, method=6)
    collision.save(MAP_ROOT / "collision-mask.png", "PNG", optimize=True)
    depth.save(MAP_ROOT / "depth-mask.png", "PNG", optimize=True)

    def animated_sheet(kind: str):
        sheet = Image.new("RGBA", (W * 4, H), (0, 0, 0, 0))
        for frame in range(4):
            layer = Image.new("RGBA", SIZE, (0, 0, 0, 0))
            d = ImageDraw.Draw(layer)
            if kind == "water":
                cx, cy = px(-23), py(-8)
                for i in range(15):
                    yy = cy - 72 + i * 10
                    start = cx - 91 + ((i * 13 + frame * 9) % 28)
                    d.line((start, yy, start + 78 + (i % 4) * 7, yy), fill=(128, 222, 207, 105), width=3)
            elif kind == "grass":
                for gx, gz in [(-19, -17), (18, -9)]:
                    for i in range(28):
                        x = px(gx + ((i*7)%16)-8)
                        y = py(gz + ((i*11)%10)-5)
                        sway = [-2, 0, 2, 0][(frame+i)%4]
                        d.line((x, y, x+sway, y-10-(i%4)*2), fill=(93, 180, 81, 145), width=2)
            else:
                acx, acy = px(22), py(19)
                radius = 22 + frame * 4
                d.ellipse((acx-radius, acy-radius-28, acx+radius, acy+radius-28), outline=(130, 255, 224, 95-frame*10), width=4)
                for i in range(18):
                    x = (i*97 + frame*31) % W
                    y = (i*53 + frame*17) % H
                    d.rectangle((x, y, x+2+(i%2), y+2+(i%3)), fill=(183, 255, 217, 60))
            sheet.alpha_composite(layer, (frame * W, 0))
        sheet.save(MAP_ROOT / f"{kind}-frames.webp" if kind != "effects" else MAP_ROOT / "effects.webp", "WEBP", lossless=True, method=6)

    animated_sheet("water")
    animated_sheet("grass")
    animated_sheet("effects")


def draw_character_sheet(path: Path, female: bool):
    cell_w, cell_h, cols, rows = 48, 64, 12, 8
    sheet = Image.new("RGBA", (cell_w*cols, cell_h*rows), (0, 0, 0, 0))
    dirs = ["front", "front-right", "right", "back-right", "back", "back-left", "left", "front-left"]
    for row, direction in enumerate(dirs):
        for col in range(cols):
            frame = col
            state = "idle" if col < 3 or col == 11 else "walk" if col < 7 else "run"
            phase = [0, 1, 0, -1][col % 4]
            im = Image.new("RGBA", (cell_w, cell_h), (0, 0, 0, 0))
            d = ImageDraw.Draw(im)
            bob = 0 if state == "idle" else abs(phase)
            skin = (224, 172, 129, 255) if not female else (234, 182, 139, 255)
            hair = (55, 42, 36, 255) if not female else (91, 47, 51, 255)
            shirt = (54, 139, 83, 255) if not female else (55, 105, 160, 255)
            shirt_hi = (92, 188, 102, 255) if not female else (91, 165, 207, 255)
            pants = (43, 59, 82, 255)
            boot = (48, 38, 34, 255)
            pack = (126, 82, 48, 255)
            outline = (32, 34, 35, 255)
            back = "back" in direction
            side = "right" if "right" in direction else "left" if "left" in direction else None
            cx = 24
            foot_y = 59 - bob
            step = phase * (3 if state == "run" else 2 if state == "walk" else 0)
            # shadow baked subtly at feet for stable contact.
            ellipse(d, (10, foot_y-2, 38, foot_y+4), (20, 33, 29, 80))
            if back:
                rect(d, (15, 29-bob, 33, 47-bob), pack, outline, 2)
                rect(d, (18, 31-bob, 30, 35-bob), (224, 185, 73, 255))
            # legs and boots.
            rect(d, (16-step, 40-bob, 22-step, 55-bob), pants, outline, 1)
            rect(d, (26+step, 40-bob, 32+step, 55-bob), pants, outline, 1)
            rect(d, (14-step, 52-bob, 22-step, 59-bob), boot, outline, 1)
            rect(d, (26+step, 52-bob, 34+step, 59-bob), boot, outline, 1)
            # torso.
            poly(d, [(14, 24-bob), (34, 24-bob), (32, 43-bob), (16, 43-bob)], shirt, outline, 2)
            rect(d, (18, 26-bob, 30, 29-bob), shirt_hi)
            rect(d, (23, 27-bob, 25, 40-bob), (225, 190, 73, 255))
            arm_swing = step if side is None else round(step*.6)
            rect(d, (9-arm_swing, 27-bob, 15-arm_swing, 43-bob), shirt, outline, 1)
            rect(d, (33+arm_swing, 27-bob, 39+arm_swing, 43-bob), shirt, outline, 1)
            rect(d, (10-arm_swing, 40-bob, 15-arm_swing, 46-bob), skin, outline, 1)
            rect(d, (33+arm_swing, 40-bob, 38+arm_swing, 46-bob), skin, outline, 1)
            # head and hair.
            rect(d, (14, 8-bob, 34, 27-bob), skin, outline, 2)
            rect(d, (13, 6-bob, 35, 13-bob), hair, outline, 1)
            rect(d, (13, 9-bob, 17, 22-bob), hair)
            rect(d, (31, 9-bob, 35, 22-bob), hair)
            if female:
                rect(d, (13, 18-bob, 17, 31-bob), hair, outline, 1)
                rect(d, (31, 18-bob, 35, 31-bob), hair, outline, 1)
                rect(d, (34, 10-bob, 38, 14-bob), (237, 196, 76, 255), outline, 1)
            else:
                poly(d, [(15, 7-bob), (18, 2-bob), (21, 7-bob)], hair, outline)
                poly(d, [(23, 7-bob), (27, 1-bob), (29, 8-bob)], hair, outline)
            if not back:
                eye_y = 17-bob
                if side == "right":
                    rect(d, (29, eye_y, 31, eye_y+2), (20, 32, 35, 255))
                elif side == "left":
                    rect(d, (17, eye_y, 19, eye_y+2), (20, 32, 35, 255))
                else:
                    rect(d, (19, eye_y, 21, eye_y+2), (20, 32, 35, 255))
                    rect(d, (27, eye_y, 29, eye_y+2), (20, 32, 35, 255))
            if not back:
                rect(d, (13, 31-bob, 16, 42-bob), pack, outline, 1)
                rect(d, (32, 31-bob, 35, 42-bob), pack, outline, 1)
            sheet.alpha_composite(im, (col*cell_w, row*cell_h))
    sheet.save(path, "PNG", optimize=True)


def draw_npc_sheet(path: Path):
    cell_w, cell_h, cols, rows = 48, 64, 4, 3
    sheet = Image.new("RGBA", (cell_w*cols, cell_h*rows), (0, 0, 0, 0))
    roles = [
        ((64, 139, 86, 255), (66, 48, 39, 255), (226, 181, 116, 255)),
        ((65, 113, 161, 255), (116, 67, 48, 255), (229, 164, 84, 255)),
        ((223, 219, 196, 255), (55, 49, 47, 255), (73, 159, 145, 255)),
    ]
    for row, (shirt, hair, accent) in enumerate(roles):
        for col in range(cols):
            bob = abs([0, 1, 0, -1][col])
            im = Image.new("RGBA", (cell_w, cell_h), (0, 0, 0, 0))
            d = ImageDraw.Draw(im)
            outline=(31,34,34,255); skin=(227,178,135,255); pants=(48,64,80,255)
            ellipse(d,(11,56,37,62),(20,32,29,75))
            rect(d,(16,39-bob,22,56-bob),pants,outline,1); rect(d,(26,39-bob,32,56-bob),pants,outline,1)
            rect(d,(15,53-bob,23,60-bob),(50,39,34,255),outline,1); rect(d,(25,53-bob,33,60-bob),(50,39,34,255),outline,1)
            poly(d,[(13,24-bob),(35,24-bob),(32,44-bob),(16,44-bob)],shirt,outline,2)
            rect(d,(22,26-bob,26,42-bob),accent)
            rect(d,(9,27-bob,15,45-bob),shirt,outline,1); rect(d,(33,27-bob,39,45-bob),shirt,outline,1)
            rect(d,(10,41-bob,15,47-bob),skin,outline,1); rect(d,(33,41-bob,38,47-bob),skin,outline,1)
            rect(d,(14,7-bob,34,27-bob),skin,outline,2); rect(d,(13,5-bob,35,13-bob),hair,outline,1)
            rect(d,(13,9-bob,17,23-bob),hair); rect(d,(31,9-bob,35,23-bob),hair)
            rect(d,(19,17-bob,21,19-bob),(20,31,34,255)); rect(d,(27,17-bob,29,19-bob),(20,31,34,255))
            if row == 2:
                rect(d,(10,23-bob,38,28-bob),(230,225,206,255),outline,1)
                rect(d,(12,28-bob,16,43-bob),(230,225,206,255)); rect(d,(32,28-bob,36,43-bob),(230,225,206,255))
                rect(d,(35,7-bob,40,12-bob),accent,outline,1)
            elif row == 1:
                rect(d,(12,3-bob,36,8-bob),accent,outline,1)
            sheet.alpha_composite(im,(col*cell_w,row*cell_h))
    sheet.save(path,"PNG",optimize=True)


def imported_names(module_name: str) -> set[str]:
    names: set[str] = set()
    pattern = re.compile(r"import\s*\{([^}]+)\}\s*from\s*[\"'][^\"']*" + re.escape(module_name) + r"[\"']", re.S)
    for file in SRC_ROOT.rglob("*.js"):
        if file.name == module_name:
            continue
        text = file.read_text(encoding="utf-8")
        for match in pattern.finditer(text):
            for item in match.group(1).split(","):
                original = item.strip().split(" as ")[0].strip()
                if original:
                    names.add(original)
    return names


def write_environment():
    required = imported_names("environment.js")
    known = {
        "createEnvironmentMaterials", "createTileInstances", "createTree", "createHouse", "createFenceSegment",
        "createSign", "createTallGrassPatch", "createFlowerPatch", "createRock", "createGate", "createPuzzleAltar",
        "createWaterTiles", "updateEnvironmentAnimation", "disposeEnvironmentAssets"
    }
    required |= known
    header = '''import { THREE } from "./engine.js";

const ART_ROOT = "assets/overworld/bosque-luminal";
const stateByParent = new WeakMap();
const textureLoader = new THREE.TextureLoader();

const configure = (texture, sheet = false) => {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.wrapS = sheet ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  if (sheet) texture.repeat.set(.25, 1);
  return texture;
};

const load = (name, sheet = false) => configure(textureLoader.load(`${ART_ROOT}/${name}`), sheet);

const worldRect = (cells = []) => {
  if (!cells.length) return { minX: -38, maxX: 38, minZ: -31, maxZ: 31 };
  const xs = cells.map((cell) => Number(cell[0]) || 0);
  const zs = cells.map((cell) => Number(cell[1]) || 0);
  const minX = Math.min(-38, ...xs) - 1;
  const maxX = Math.max(38, ...xs) + 1;
  const minZ = Math.min(-31, ...zs) - 1;
  const maxZ = Math.max(31, ...zs) + 1;
  return { minX, maxX, minZ, maxZ };
};

const layer = ({ parent, name, file, bounds, y, renderOrder, transparent = true, sheet = false, depthTest = true }) => {
  const width = bounds.maxX - bounds.minX;
  const depth = bounds.maxZ - bounds.minZ;
  const texture = load(file, sheet);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent,
    alphaTest: transparent ? .025 : 0,
    depthTest,
    depthWrite: !transparent,
    side: THREE.DoubleSide,
    toneMapped: false
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), material);
  mesh.name = name;
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set((bounds.minX + bounds.maxX) * .5, y, (bounds.minZ + bounds.maxZ) * .5);
  mesh.renderOrder = renderOrder;
  mesh.frustumCulled = false;
  if (sheet) {
    mesh.onBeforeRender = () => {
      const frame = Math.floor(performance.now() / 260) % 4;
      texture.offset.x = frame * .25;
    };
  }
  parent.add(mesh);
  return mesh;
};

const ensureLayeredMap = (parent, cells = []) => {
  if (stateByParent.has(parent)) return stateByParent.get(parent);
  const bounds = worldRect(cells);
  const group = new THREE.Group();
  group.name = "BosqueLuminalPreRenderedLayers";
  parent.add(group);
  const state = {
    group,
    bounds,
    ground: layer({ parent: group, name: "BosqueLuminalGround", file: "ground.webp", bounds, y: -.09, renderOrder: -20, transparent: false }),
    shadows: layer({ parent: group, name: "BosqueLuminalShadows", file: "shadows.webp", bounds, y: .006, renderOrder: 1 }),
    water: layer({ parent: group, name: "BosqueLuminalWaterAnimation", file: "water-frames.webp", bounds, y: .012, renderOrder: 2, sheet: true }),
    grass: layer({ parent: group, name: "BosqueLuminalGrassAnimation", file: "grass-frames.webp", bounds, y: .018, renderOrder: 3, sheet: true }),
    effects: layer({ parent: group, name: "BosqueLuminalEffects", file: "effects.webp", bounds, y: .024, renderOrder: 4, sheet: true, depthTest: false }),
    foreground: layer({ parent: group, name: "BosqueLuminalForeground", file: "foreground.webp", bounds, y: 3.4, renderOrder: 90, depthTest: false })
  };
  stateByParent.set(parent, state);
  return state;
};

const anchor = ({ parent, x = 0, z = 0, name = "BosqueLuminalArtAnchor" } = {}) => {
  const group = new THREE.Group();
  group.name = name;
  group.position.set(Number(x) || 0, 0, Number(z) || 0);
  group.userData.preRendered = true;
  group.update = () => {};
  group.dispose = () => {};
  parent?.add?.(group);
  return group;
};

export const createEnvironmentMaterials = (textures = {}) => ({ textures, preRendered: true });
export const createTileInstances = ({ parent, cells = [], name = "BosqueLuminalTiles" } = {}) => {
  const scene = ensureLayeredMap(parent, cells);
  const result = anchor({ parent, name });
  result.userData.layeredScene = scene;
  return result;
};
export const createWaterTiles = ({ parent, cells = [], name = "BosqueLuminalWater" } = {}) => {
  const scene = ensureLayeredMap(parent, cells);
  const result = anchor({ parent, name });
  result.userData.layeredScene = scene;
  return result;
};
export const updateEnvironmentAnimation = () => {};
export const disposeEnvironmentAssets = (parent) => {
  const state = stateByParent.get(parent);
  state?.group?.traverse?.((object) => {
    object.geometry?.dispose?.();
    if (Array.isArray(object.material)) object.material.forEach((material) => { material.map?.dispose?.(); material.dispose?.(); });
    else { object.material?.map?.dispose?.(); object.material?.dispose?.(); }
  });
  state?.group?.removeFromParent?.();
  stateByParent.delete(parent);
};
'''
    already = {"createEnvironmentMaterials", "createTileInstances", "createWaterTiles", "updateEnvironmentAnimation", "disposeEnvironmentAssets"}
    body = [header]
    for name in sorted(required - already):
        body.append(f'export const {name} = (options = {{}}) => anchor({{ ...options, name: "{name}" }});\n')
    (SRC_ROOT / "environment.js").write_text("".join(body), encoding="utf-8")


def write_sprites():
    required = imported_names("sprites.js")
    required |= {"DirectionalSpriteRig", "NpcSpriteRig", "createNpcSprite"}
    base = '''import { THREE } from "./engine.js";

const loader = new THREE.TextureLoader();
const DIRECTIONS = ["front", "front-right", "right", "back-right", "back", "back-left", "left", "front-left"];
const textureCache = new Map();

const configure = (texture, cols, rows) => {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1 / cols, 1 / rows);
  return texture;
};

const getTexture = (path, cols, rows) => {
  const key = `${path}:${cols}:${rows}`;
  if (!textureCache.has(key)) textureCache.set(key, configure(loader.load(path), cols, rows));
  return textureCache.get(key).clone();
};

const shadowTexture = (() => {
  let texture = null;
  return () => {
    if (texture) return texture;
    const canvas = document.createElement("canvas");
    canvas.width = 32; canvas.height = 16;
    const context = canvas.getContext("2d", { alpha: true });
    context.imageSmoothingEnabled = false;
    context.fillStyle = "rgba(14,27,24,.45)";
    context.beginPath(); context.ellipse(16, 8, 13, 5, 0, 0, Math.PI * 2); context.fill();
    texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter; texture.minFilter = THREE.NearestFilter; texture.generateMipmaps = false;
    return texture;
  };
})();

const directionFromVelocity = (velocity, fallback = "front") => {
  if (!velocity || Math.hypot(Number(velocity.x) || 0, Number(velocity.z) || 0) < .04) return fallback;
  const angle = Math.atan2(velocity.x, velocity.z);
  return DIRECTIONS[(Math.round(angle / (Math.PI / 4)) + 8) % 8];
};

class SheetRig {
  constructor({ path, cols, rows, row = 0, width = 2.25, height = 3.05, directional = false } = {}) {
    this.cols = cols; this.rows = rows; this.fixedRow = row; this.directional = directional; this.direction = "front";
    this.root = new THREE.Group();
    this.root.name = directional ? "OverworldPreRenderedHero" : "OverworldPreRenderedNpc";
    const shadowMaterial = new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false, toneMapped: false });
    this.shadow = new THREE.Mesh(new THREE.PlaneGeometry(width * .88, width * .4), shadowMaterial);
    this.shadow.rotation.x = -Math.PI / 2; this.shadow.position.y = .012; this.shadow.renderOrder = 4;
    this.root.add(this.shadow);
    this.texture = getTexture(path, cols, rows);
    this.material = new THREE.SpriteMaterial({ map: this.texture, transparent: true, alphaTest: .035, depthTest: true, depthWrite: false, toneMapped: false });
    this.sprite = new THREE.Sprite(this.material);
    this.sprite.center.set(.5, .055); this.sprite.position.y = .03; this.sprite.scale.set(width, height, 1); this.sprite.renderOrder = 8;
    this.root.add(this.sprite);
    this.setFrame(0, row);
  }
  setFrame(col, row) {
    const safeCol = ((col % this.cols) + this.cols) % this.cols;
    const safeRow = ((row % this.rows) + this.rows) % this.rows;
    this.texture.offset.x = safeCol / this.cols;
    this.texture.offset.y = 1 - (safeRow + 1) / this.rows;
    this.texture.needsUpdate = true;
  }
  update({ state = "idle", velocity = { x: 0, z: 0 }, elapsed = 0 } = {}) {
    if (this.directional) this.direction = directionFromVelocity(velocity, this.direction);
    const row = this.directional ? Math.max(0, DIRECTIONS.indexOf(this.direction)) : this.fixedRow;
    let start = 0; let count = 3; let fps = 3;
    if (state === "walking") { start = 3; count = 4; fps = 7; }
    if (state === "running") { start = 7; count = 4; fps = 11; }
    const frame = start + Math.floor(elapsed * fps) % count;
    this.setFrame(frame, row);
    const moving = state === "walking" || state === "running";
    this.sprite.position.y = .03 + (moving ? Math.abs(Math.sin(elapsed * fps * Math.PI)) * .035 : Math.sin(elapsed * 2.2) * .012);
    this.shadow.scale.x = state === "running" ? 1.08 : 1;
  }
  dispose() {
    this.texture.dispose(); this.material.dispose(); this.sprite.geometry?.dispose?.();
    this.shadow.material.map?.dispose?.(); this.shadow.material.dispose?.(); this.shadow.geometry?.dispose?.();
  }
}

export class DirectionalSpriteRig extends SheetRig {
  constructor({ characterImage = "" } = {}) {
    const female = String(characterImage).toLowerCase().includes("female");
    super({ path: female ? "assets/overworld/characters/hero-female/hero-female-sheet.png" : "assets/overworld/characters/hero-male/hero-male-sheet.png", cols: 12, rows: 8, width: 2.35, height: 3.18, directional: true });
    this.root.name = female ? "OverworldPreRenderedHero-female" : "OverworldPreRenderedHero-male";
  }
}

export class NpcSpriteRig extends SheetRig {
  constructor({ role = "story" } = {}) {
    const rows = { story: 0, resident: 1, researcher: 2, merchant: 1, trainer: 0, optional: 1 };
    super({ path: "assets/overworld/characters/npcs/npc-sheet.png", cols: 4, rows: 3, row: rows[role] ?? 0, width: 2.15, height: 2.95 });
    this.role = role;
  }
  update({ elapsed = 0 } = {}) {
    this.setFrame(Math.floor(elapsed * 2.5) % 4, this.fixedRow);
    this.sprite.position.y = .03 + Math.sin(elapsed * 2.4 + this.fixedRow) * .012;
  }
}

export const createNpcSprite = (options = {}) => {
  const rig = new NpcSpriteRig(options);
  rig.root.userData.rig = rig;
  rig.root.update = (payload) => rig.update(payload);
  rig.root.dispose = () => rig.dispose();
  return rig.root;
};
'''
    declared = {"DirectionalSpriteRig", "NpcSpriteRig", "createNpcSprite"}
    extras = []
    all_text = "\n".join(p.read_text(encoding="utf-8") for p in SRC_ROOT.rglob("*.js") if p.name != "sprites.js")
    for name in sorted(required - declared):
        used_with_new = bool(re.search(r"new\s+" + re.escape(name) + r"\s*\(", all_text))
        if used_with_new or name[:1].isupper():
            extras.append(f'export class {name} extends NpcSpriteRig {{}}\n')
        else:
            extras.append(f'export const {name} = (options = {{}}) => createNpcSprite(options);\n')
    (SRC_ROOT / "sprites.js").write_text(base + "".join(extras), encoding="utf-8")


def main():
    save_assets()
    draw_character_sheet(CHAR_ROOT / "hero-male/hero-male-sheet.png", False)
    draw_character_sheet(CHAR_ROOT / "hero-female/hero-female-sheet.png", True)
    draw_npc_sheet(CHAR_ROOT / "npcs/npc-sheet.png")
    write_environment()
    write_sprites()
    # No temporary tools or stale generated atlases in the final tree.
    for path in [ROOT / "assets/overworld/environment-atlas.png", ROOT / "assets/overworld/tiles-atlas.png"]:
        if path.exists():
            path.unlink()


if __name__ == "__main__":
    main()
