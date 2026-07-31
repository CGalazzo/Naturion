from PIL import Image, ImageDraw, ImageFilter, ImageOps
import math, os, json, textwrap, hashlib, struct

outdir='assets/overworld/visual-reset/validation'
os.makedirs(outdir, exist_ok=True)

def hval(x,y,seed=0):
    n = (x*374761393 + y*668265263 + seed*1442695040888963407) & 0xffffffff
    n = (n ^ (n >> 13)) * 1274126177 & 0xffffffff
    return (n ^ (n >> 16)) & 255

PAL = {
    'outline': (20, 36, 30, 255), 'deep': (22, 59, 47, 255), 'grass0': (42, 103, 55, 255),
    'grass1': (56, 127, 65, 255), 'grass2': (83, 151, 73, 255), 'grass3': (133, 181, 78, 255),
    'moss': (166, 197, 76, 255), 'path0': (117, 91, 57, 255), 'path1': (149, 119, 70, 255),
    'path2': (180, 148, 82, 255), 'stone0': (48, 66, 59, 255), 'stone1': (70, 88, 76, 255),
    'stone2': (96, 108, 86, 255), 'stone3': (130, 131, 95, 255), 'wood0': (70, 43, 27, 255),
    'wood1': (104, 62, 35, 255), 'wood2': (151, 92, 43, 255), 'roof0': (34, 69, 63, 255),
    'roof1': (52, 100, 82, 255), 'roof2': (80, 139, 95, 255), 'cyan0': (31, 134, 137, 255),
    'cyan1': (48, 206, 190, 255), 'cyan2': (156, 255, 218, 255), 'water0': (25, 101, 111, 255),
    'water1': (35, 143, 143, 255), 'water2': (72, 192, 167, 255), 'cream': (226, 211, 152, 255),
    'gold': (226, 185, 67, 255),
}

S=512
ground = Image.new('RGBA',(S,S),PAL['grass0'])
d=ImageDraw.Draw(ground)
for y in range(0,S,2):
    for x in range(0,S,2):
        hv=hval(x//2,y//2,3); col=PAL['grass0']
        if hv<28: col=PAL['deep']
        elif hv<80: col=PAL['grass1']
        elif hv<108: col=PAL['grass2']
        d.rectangle([x,y,x+1,y+1],fill=col)
for i in range(18):
    cx=(i*89+37)%S; cy=(i*137+61)%S; rx=24+(i*7)%46; ry=12+(i*11)%30
    d.ellipse([cx-rx,cy-ry,cx+rx,cy+ry],fill=PAL['grass1'] if i%3 else PAL['grass2'])
for y in range(0,S,4):
    for x in range(0,S,4):
        hv=hval(x,y,11)
        if hv<25: d.rectangle([x,y,x+2,y+1],fill=PAL['grass3'])
        elif hv>242: d.point((x+1,y+1),fill=PAL['moss'])
path_main=[(68,512),(114,512),(118,425),(108,360),(119,300),(104,242),(112,182),(99,128),(112,65),(107,0),(75,0),(79,70),(68,130),(80,188),(66,250),(79,310),(67,370),(78,430)]
branch=[(96,135),(145,120),(206,95),(262,77),(322,74),(330,104),(269,110),(213,128),(156,151),(109,168)]
d.polygon(path_main,fill=PAL['path1']); d.polygon(branch,fill=PAL['path1'])
mask=Image.new('1',(S,S),0); md=ImageDraw.Draw(mask); md.polygon(path_main,fill=1); md.polygon(branch,fill=1); pix=mask.load()
for y in range(0,S,3):
    for x in range(0,S,3):
        if pix[x,y]:
            hv=hval(x,y,23)
            if hv<55: col=PAL['path0']
            elif hv>220: col=PAL['path2']
            else: continue
            d.rectangle([x,y,x+2,y+1],fill=col)
for i,(x,y) in enumerate([(91,461),(88,419),(92,374),(87,330),(94,286),(88,235),(95,190),(91,145),(136,132),(181,113),(230,96),(283,91)]):
    w=8+(i%3)*3; h=4+(i%2)*2
    d.rounded_rectangle([x-w,y-h,x+w,y+h],radius=2,fill=PAL['stone1'],outline=PAL['outline'],width=1)
    d.line([x-w+2,y-h+1,x+w-3,y-h+1],fill=PAL['stone3'],width=1)
pond_poly=[(365,340),(390,323),(430,326),(463,346),(470,377),(452,403),(410,414),(374,400),(354,370)]
d.polygon(pond_poly,fill=PAL['stone0']); d.polygon([(372,345),(396,333),(429,337),(455,350),(462,375),(446,394),(411,404),(383,392),(364,370)],fill=PAL['water0'])
for y in range(340,405,5):
    for x in range(365,460,6):
        if hval(x,y,31)<90: d.line([(x,y),(x+5,y)],fill=PAL['water1'],width=1)
d.polygon([(230,48),(340,48),(363,78),(347,154),(224,154),(208,78)],fill=(10,25,22,90))
d.polygon([(220,72),(347,72),(347,151),(220,151)],fill=PAL['stone1'],outline=PAL['outline'])
d.polygon([(226,78),(341,78),(341,143),(226,143)],fill=(206,180,115,255),outline=PAL['wood0'])
for x in [230,282,337]: d.rectangle([x,80,x+5,143],fill=PAL['wood1'])
d.rectangle([226,108,341,114],fill=PAL['wood1']); d.rectangle([272,107,300,147],fill=PAL['wood0'],outline=PAL['outline']); d.rectangle([278,112,294,144],fill=PAL['wood1']); d.rectangle([290,127,293,130],fill=PAL['gold'])
for x in [241,313]:
    d.rectangle([x,94,x+19,114],fill=PAL['outline']); d.rectangle([x+3,97,x+16,111],fill=PAL['cyan1']); d.line([x+9,97,x+9,111],fill=PAL['cream'])
for x in range(255,319,12): d.rectangle([x,145,x+9,151],fill=PAL['stone2'])
for bx,by,bw,bh in [(18,55,42,105),(15,38,48,22)]: d.rectangle([bx,by,bx+bw,by+bh],fill=PAL['stone0'],outline=PAL['outline'])
for yy in range(44,155,12):
    off=0 if (yy//12)%2==0 else 7
    for xx in range(18+off,60,14):
        d.rectangle([xx,yy,xx+11,yy+8],fill=PAL['stone1'],outline=PAL['deep'])
        if hval(xx,yy,44)<110: d.rectangle([xx+2,yy+1,xx+9,yy+2],fill=PAL['stone2'])
for x in range(18,60,6): d.rectangle([x,38,x+3,38+3+(hval(x,50,55)%15)],fill=PAL['moss'])
tree_data=[(470,70,1.0),(420,190,0.9),(35,275,1.05),(185,340,0.85),(485,465,1.1)]
for cx,cy,sc in tree_data:
    w=int(14*sc); h=int(38*sc)
    d.rectangle([cx-w//2,cy-h//2,cx+w//2,cy+h//2],fill=PAL['wood0'],outline=PAL['outline']); d.rectangle([cx-w//2+3,cy-h//2+2,cx-1,cy+h//2-2],fill=PAL['wood2'])
    for ang in [-2,-1,1,2]:
        dx=ang*8; d.polygon([(cx,cy+h//2-4),(cx+dx,cy+h//2+10),(cx+dx+5,cy+h//2+11),(cx+4,cy+h//2)],fill=PAL['wood0'])
    d.ellipse([cx-18,cy+h//2-4,cx+18,cy+h//2+12],fill=(70,117,55,255))
flower_cols=[(247,209,92),(236,104,90),(91,184,190),(232,192,99)]
for i in range(90):
    x=(i*83+29)%S; y=(i*149+77)%S
    if pix[x,y] or (205<x<365 and 35<y<160) or (350<x<475 and 315<y<420) or hval(x,y,61)>105: continue
    d.point((x,y),fill=(46,105,50,255)); d.point((x,y-1),fill=(46,105,50,255)); d.rectangle([x-1,y-3,x+1,y-1],fill=flower_cols[i%4])
for row in range(5):
    for col in range(7):
        x=382+col*15+(row%2)*5; y=225+row*14; shade=[PAL['grass2'],PAL['grass3'],PAL['moss']][(row+col)%3]
        d.polygon([(x,y+14),(x-4,y+5),(x,y+8),(x+2,y),(x+4,y+9),(x+8,y+4),(x+6,y+14)],fill=shade,outline=PAL['deep'])
def crystal_cluster(draw,cx,cy,scale=1):
    for x1,y1,x2,y2,x3,y3 in [(-10,10,-4,-16,2,9),(0,10,5,-23,10,10),(9,11,14,-12,18,12)]:
        poly=[(cx+x1*scale,cy+y1*scale),(cx+x2*scale,cy+y2*scale),(cx+x3*scale,cy+y3*scale)]
        draw.polygon(poly,fill=PAL['cyan1'],outline=PAL['outline']); draw.line([(cx+x2*scale,cy+y2*scale),(cx+x3*scale-2,cy+y3*scale-2)],fill=PAL['cyan2'],width=max(1,int(scale)))
for p in [(53,170,.8),(346,181,.7),(455,430,.8)]: crystal_cluster(d,*p)
shadow=Image.new('RGBA',(S,S),(0,0,0,0)); sd=ImageDraw.Draw(shadow); sd.ellipse([205,135,362,170],fill=(8,23,19,75))
for cx,cy,sc in tree_data: sd.ellipse([cx-28*sc,cy+12*sc,cx+34*sc,cy+27*sc],fill=(6,20,17,90))
ground.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(2)))
d=ImageDraw.Draw(ground); d.rectangle([3,3,S-4,S-4],outline=(29,83,55,150),width=5)
for i in range(4): d.rectangle([8+i*2,8+i*2,S-9-i*2,S-9-i*2],outline=(63,130,66,60),width=1)
ground.resize((1024,1024),Image.Resampling.NEAREST).convert('RGB').save(os.path.join(outdir,'validation-ground.webp'),'WEBP',quality=92,method=6)
atlas_small=Image.new('RGBA',(512,128),(0,0,0,0)); ad=ImageDraw.Draw(atlas_small)
def draw_canopy(draw,ox,variant=0):
    clusters=[(64,55,43),(35,63,29),(92,67,32),(56,32,31),(84,35,25)]; colors=[PAL['deep'],PAL['grass0'],PAL['grass1'],PAL['grass2'],PAL['grass3']]
    for idx,(cx,cy,r) in enumerate(clusters):
        col=colors[(idx+variant)%len(colors)]; draw.ellipse([ox+cx-r,cy-r*.65,ox+cx+r,cy+r*.65],fill=col,outline=PAL['outline'],width=2); draw.arc([ox+cx-r+5,cy-r*.65+4,ox+cx+r-5,cy+r*.65-4],190,330,fill=PAL['grass3'],width=2)
    for i in range(28):
        x=ox+20+(i*37+variant*11)%90; y=20+(i*53)%70; draw.rectangle([x,y,x+2,y+1],fill=PAL['moss'])
def draw_roof(draw,ox):
    draw.polygon([(ox+12,70),(ox+32,27),(ox+94,27),(ox+118,70),(ox+105,91),(ox+24,91)],fill=PAL['outline']); draw.polygon([(ox+17,67),(ox+35,31),(ox+92,31),(ox+112,67),(ox+101,83),(ox+27,83)],fill=PAL['roof0'])
    for yy in range(36,79,8):
        for xx in range(25+(yy//8)%2*4,106,12): draw.line([(ox+xx,yy),(ox+xx+9,yy)],fill=PAL['roof2'],width=2)
    for x in range(27,105,7): draw.rectangle([ox+x,29,ox+x+3,31+(hval(x,20,77)%5)],fill=PAL['moss'])
    draw.rectangle([ox+84,12,ox+99,45],fill=PAL['stone0'],outline=PAL['outline']); draw.rectangle([ox+82,10,ox+101,17],fill=PAL['stone2'],outline=PAL['outline'])
def draw_branch(draw,ox):
    draw.line([(ox+8,88),(ox+42,46),(ox+82,31),(ox+120,49)],fill=PAL['outline'],width=11); draw.line([(ox+9,84),(ox+43,49),(ox+82,35),(ox+118,52)],fill=PAL['wood1'],width=6)
    for i in range(9):
        cx=ox+18+i*12; cy=45-int(15*math.sin(i*.5)); draw.ellipse([cx-12,cy-8,cx+12,cy+8],fill=[PAL['grass0'],PAL['grass1'],PAL['grass2']][i%3],outline=PAL['outline'])
draw_roof(ad,0); draw_canopy(ad,128,0); draw_canopy(ad,256,2); draw_branch(ad,384)
atlas_small.resize((1024,256),Image.Resampling.NEAREST).save(os.path.join(outdir,'validation-occlusion.png'))
effects=Image.new('RGBA',(512,128),(0,0,0,0))
for frame in range(4):
    fd=ImageDraw.Draw(effects); ox=frame*128; radius=18+frame*2
    fd.ellipse([ox+64-radius,64-radius//2,ox+64+radius,64+radius//2],outline=(70,235,190,70+frame*20),width=2)
    for i in range(9):
        ang=i*.7+frame*.35; x=ox+64+int(math.cos(ang)*(18+(i%3)*7)); y=64+int(math.sin(ang)*(10+(i%4)*5)); fd.rectangle([x,y,x+2,y+2],fill=PAL['cyan2'] if i%2 else PAL['moss'])
    for i in range(5):
        x=ox+25+(i*19+frame*6)%82; y=18+(i*17+frame*3)%70; fd.rectangle([x,y,x+3,y+1],fill=PAL['moss'])
effects.save(os.path.join(outdir,'validation-effects.png'))
sh=Image.new('RGBA',(128,64),(0,0,0,0)); sd=ImageDraw.Draw(sh); sd.ellipse([18,22,110,50],fill=(4,15,13,115)); sd.ellipse([34,27,94,46],fill=(4,15,13,80)); sh.filter(ImageFilter.GaussianBlur(1.2)).save(os.path.join(outdir,'contact-shadow.png'))
