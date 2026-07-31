from PIL import Image, ImageDraw
import os

char_out='assets/overworld/visual-reset/validation'
os.makedirs(char_out, exist_ok=True)
CELL_W,CELL_H=64,80
COLS,ROWS=11,8
dir_names=["front","front-right","right","back-right","back","back-left","left","front-left"]

def px(draw,x,y,w,h,c): draw.rectangle([x,y,x+w-1,y+h-1],fill=c)
def poly(draw,pts,c): draw.polygon(pts,fill=c)

def draw_hero_low(variant='male',direction='front',frame=0,state='idle'):
    im=Image.new('RGBA',(32,40),(0,0,0,0)); dr=ImageDraw.Draw(im)
    outline=(30,31,26,255); skin=(193,119,68,255); skin_hi=(229,158,94,255); skin_sh=(139,76,47,255)
    hair=(63,35,24,255) if variant=='male' else (51,31,27,255); hair_hi=(111,64,35,255) if variant=='male' else (92,55,44,255)
    cream=(224,214,166,255); cream_sh=(174,161,119,255); green=(42,108,73,255) if variant=='male' else (36,114,93,255)
    green_hi=(77,157,99,255) if variant=='male' else (64,166,135,255); green_sh=(28,75,57,255)
    pants=(46,49,46,255) if variant=='male' else (47,46,55,255); pants_hi=(70,74,67,255)
    boot=(88,52,31,255); boot_hi=(144,87,44,255); bag=(104,66,38,255); bag_hi=(157,98,52,255); gold=(230,181,66,255); cyan=(60,200,180,255)
    if state=='idle': bob=[0,0,-1][frame%3]; leg_phase=0; arm_phase=0
    elif state=='walk': bob=[0,-1,0,-1][frame%4]; leg_phase=[-1,0,1,0][frame%4]; arm_phase=-leg_phase
    else: bob=[0,-2,0,-1][frame%4]; leg_phase=[-2,0,2,0][frame%4]; arm_phase=-leg_phase
    cy=bob; back='back' in direction; right='right' in direction; left='left' in direction; diag='-' in direction; side=right or left
    if back or side or diag:
        bx=8 if right else 19 if left else 9
        if back: bx=8
        px(dr,bx,15+cy,6,12,outline); px(dr,bx+1,16+cy,4,10,bag); px(dr,bx+2,17+cy,2,5,bag_hi); px(dr,bx+1,25+cy,4,2,outline)
    lx=11+leg_phase; rx=18-leg_phase
    if side: lx=14+leg_phase; rx=16-leg_phase
    for x in [lx,rx]:
        px(dr,x,27+cy,4,8,outline); px(dr,x+1,27+cy,2,6,pants); px(dr,x+1,28+cy,1,3,pants_hi)
    px(dr,lx-1,34+cy,6,4,outline); px(dr,lx,34+cy,5,3,boot); px(dr,lx+1,34+cy,3,1,boot_hi)
    px(dr,rx-1,34+cy,6,4,outline); px(dr,rx,34+cy,5,3,boot); px(dr,rx+1,34+cy,3,1,boot_hi)
    poly(dr,[(9,14+cy),(22,14+cy),(25,26+cy),(22,29+cy),(10,29+cy),(7,26+cy)],outline)
    poly(dr,[(10,15+cy),(21,15+cy),(23,26+cy),(20,28+cy),(11,28+cy),(9,26+cy)],cream)
    poly(dr,[(11,15+cy),(15,16+cy),(15,27+cy),(11,27+cy),(9,24+cy)],green)
    poly(dr,[(16,16+cy),(20,15+cy),(22,24+cy),(20,27+cy),(16,27+cy)],green_sh)
    px(dr,12,16+cy,2,9,green_hi); px(dr,17,17+cy,2,8,green); px(dr,15,16+cy,1,11,cream_sh); px(dr,15,15+cy,2,3,gold); px(dr,14,22+cy,4,2,(182,121,46,255))
    px(dr,10,26+cy,12,2,outline); px(dr,11,26+cy,10,1,bag); px(dr,15,26+cy,2,2,gold)
    if side:
        ax_front=20 if right else 8; ax_back=8 if right else 20
        px(dr,ax_back,16+cy+arm_phase,4,11,outline); px(dr,ax_back+1,17+cy+arm_phase,2,7,cream_sh)
        px(dr,ax_front,16+cy-arm_phase,4,12,outline); px(dr,ax_front+1,17+cy-arm_phase,2,8,cream); px(dr,ax_front+1,25+cy-arm_phase,2,3,skin)
    else:
        px(dr,6,16+cy+arm_phase,5,12,outline); px(dr,7,17+cy+arm_phase,3,8,cream_sh); px(dr,7,25+cy+arm_phase,3,3,skin)
        px(dr,21,16+cy-arm_phase,5,12,outline); px(dr,22,17+cy-arm_phase,3,8,cream); px(dr,22,25+cy-arm_phase,3,3,skin_hi)
    if side:
        hx=10 if right else 11; px(dr,hx,3+cy,12,13,outline); px(dr,hx+1,3+cy,10,6,hair)
        for cx,yy in [(hx,5),(hx+3,2),(hx+7,2),(hx+10,5),(hx+9,8)]: px(dr,cx,yy+cy,3,3,hair)
        px(dr,hx+3,8+cy,8,7,skin); fx=hx+9 if right else hx+3; px(dr,fx,10+cy,2,2,outline); px(dr,fx+(0 if right else 1),10+cy,1,1,(52,36,26,255)); px(dr,hx+4,8+cy,4,1,skin_hi); px(dr,hx+2 if right else hx+10,9+cy,2,4,skin_sh)
    elif back:
        px(dr,9,3+cy,14,13,outline); px(dr,10,3+cy,12,12,hair)
        for cx,yy in [(9,5),(11,2),(15,1),(19,2),(21,5),(10,9),(20,9)]: px(dr,cx,yy+cy,3,3,hair)
        px(dr,13,5+cy,6,2,hair_hi); px(dr,14,14+cy,4,2,skin_sh)
    else:
        px(dr,9,2+cy,14,14,outline); px(dr,11,6+cy,10,9,skin); px(dr,12,7+cy,8,3,skin_hi); px(dr,9,9+cy,2,4,skin_sh); px(dr,21,9+cy,2,4,skin); px(dr,10,3+cy,12,6,hair)
        for cx,yy in [(9,5),(11,2),(15,1),(19,2),(21,5),(10,7),(20,7)]: px(dr,cx,yy+cy,3,3,hair)
        px(dr,13,3+cy,4,2,hair_hi); eye_shift=1 if right else -1 if left else 0
        px(dr,12+eye_shift,10+cy,2,1,outline); px(dr,18+eye_shift,10+cy,2,1,outline); px(dr,13+eye_shift,11+cy,1,1,(39,35,27,255)); px(dr,19+eye_shift,11+cy,1,1,(39,35,27,255)); px(dr,16+eye_shift,12+cy,1,1,skin_sh); px(dr,14+eye_shift,14+cy,4,1,(97,48,35,255))
        if diag:
            if right: px(dr,10,7+cy,3,7,skin_sh)
            else: px(dr,19,7+cy,3,7,skin_sh)
    if not back: px(dr,12,4+cy,2,1,hair_hi); px(dr,17,3+cy,2,1,hair_hi)
    if variant=='female':
        if side:
            tx=8 if right else 21; px(dr,tx,5+cy,4,9,outline); px(dr,tx+1,6+cy,2,7,hair)
        elif back: px(dr,13,13+cy,6,7,outline); px(dr,14,14+cy,4,5,hair)
        else: px(dr,22,6+cy,4,9,outline); px(dr,23,7+cy,2,7,hair)
        px(dr,12,5+cy,3,2,gold); px(dr,18,5+cy,3,2,gold); px(dr,13,5+cy,1,1,cyan); px(dr,19,5+cy,1,1,cyan)
    return im

def make_hero_sheet(variant):
    sheet=Image.new('RGBA',(COLS*CELL_W,ROWS*CELL_H),(0,0,0,0))
    for r,direction in enumerate(dir_names):
        for c in range(COLS):
            if c<3: state='idle'; fi=c
            elif c<7: state='walk'; fi=c-3
            else: state='run'; fi=c-7
            sheet.alpha_composite(draw_hero_low(variant,direction,fi,state).resize((64,80),Image.Resampling.NEAREST),(c*CELL_W,r*CELL_H))
    return sheet
make_hero_sheet('male').save(os.path.join(char_out,'hero-male.png')); make_hero_sheet('female').save(os.path.join(char_out,'hero-female.png'))

def draw_npc_low(role,frame):
    im=Image.new('RGBA',(32,40),(0,0,0,0)); dr=ImageDraw.Draw(im); o=(29,31,27,255); skin=(194,124,75,255); skinhi=(229,164,99,255); boot=(78,46,30,255); bob=[0,-1,0,0][frame]
    if role=='story': hair=(116,58,35,255); hairhi=(179,100,48,255); coat=(216,177,74,255); coat2=(91,135,75,255); pants=(52,52,47,255)
    elif role=='resident': hair=(105,104,91,255); hairhi=(171,166,136,255); coat=(131,87,50,255); coat2=(199,151,81,255); pants=(61,56,49,255)
    else: hair=(44,34,28,255); hairhi=(92,63,39,255); coat=(43,119,98,255); coat2=(211,203,154,255); pants=(45,47,54,255)
    px(dr,11,27+bob,4,8,o); px(dr,12,28+bob,2,6,pants); px(dr,17,27+bob,4,8,o); px(dr,18,28+bob,2,6,pants); px(dr,10,34+bob,6,4,o); px(dr,11,34+bob,4,3,boot); px(dr,16,34+bob,6,4,o); px(dr,17,34+bob,4,3,boot)
    poly(dr,[(8,14+bob),(23,14+bob),(25,27+bob),(21,30+bob),(10,30+bob),(7,27+bob)],o); poly(dr,[(10,15+bob),(21,15+bob),(23,27+bob),(20,29+bob),(11,29+bob),(9,27+bob)],coat); px(dr,12,16+bob,3,11,coat2); px(dr,16,16+bob,3,11,coat2)
    gesture=[0,1,0,-1][frame]; px(dr,5,16+bob+gesture,5,11,o); px(dr,6,17+bob+gesture,3,7,coat2); px(dr,6,24+bob+gesture,3,3,skin); px(dr,22,16+bob-gesture,5,11,o); px(dr,23,17+bob-gesture,3,7,coat2); px(dr,23,24+bob-gesture,3,3,skinhi)
    px(dr,9,2+bob,14,14,o); px(dr,11,6+bob,10,9,skin); px(dr,12,7+bob,8,3,skinhi); px(dr,10,3+bob,12,6,hair)
    for cx,yy in [(9,5),(11,2),(15,1),(19,2),(21,5)]: px(dr,cx,yy+bob,3,3,hair)
    px(dr,13,3+bob,4,2,hairhi); px(dr,12,10+bob,2,1,o); px(dr,18,10+bob,2,1,o); px(dr,13,11+bob,1,1,(40,35,28,255)); px(dr,19,11+bob,1,1,(40,35,28,255)); px(dr,15,14+bob,3,1,(100,50,37,255))
    if role=='resident': px(dr,12,14+bob,8,4,o); px(dr,13,14+bob,6,3,(113,77,54,255))
    if role=='researcher': px(dr,12,5+bob,3,2,(222,181,69,255)); px(dr,18,5+bob,3,2,(222,181,69,255)); px(dr,13,5+bob,1,1,(72,208,190,255)); px(dr,19,5+bob,1,1,(72,208,190,255)); px(dr,21,18+bob,4,10,(104,68,40,255))
    return im
npc_sheet=Image.new('RGBA',(4*64,3*80),(0,0,0,0))
for r,role in enumerate(['story','resident','researcher']):
    for c in range(4): npc_sheet.alpha_composite(draw_npc_low(role,c).resize((64,80),Image.Resampling.NEAREST),(c*64,r*80))
npc_sheet.save(os.path.join(char_out,'npc-atlas.png'))
