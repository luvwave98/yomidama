import numpy as np, json, os
from PIL import Image, ImageOps, ImageFilter, ImageDraw
IM='/tmp/claude-0/-home-user/86f94802-41c0-50f8-99c5-b10d53ec1053/images/'
OUT='yomidama/assets/'
def rgb2hsv(a):
    a=a.astype(np.float32)/255;r,g,b=a[...,0],a[...,1],a[...,2]
    mx=a.max(-1);mn=a.min(-1);d=mx-mn+1e-6
    h=np.where(mx==r,((g-b)/d)%6,np.where(mx==g,(b-r)/d+2,(r-g)/d+4))*60
    s=np.where(mx>0,(mx-mn)/(mx+1e-6),0);return h,s,mx
def hsv2rgb(h,s,v):
    c=v*s;x=c*(1-np.abs((h/60)%2-1));m=v-c;z=np.zeros_like(h)
    k=(h//60).astype(int)%6
    r=np.select([k==0,k==1,k==2,k==3,k==4,k==5],[c,x,z,z,x,c]);g=np.select([k==0,k==1,k==2,k==3,k==4,k==5],[x,c,c,x,z,z]);b=np.select([k==0,k==1,k==2,k==3,k==4,k==5],[z,z,x,c,c,x])
    return np.stack([r+m,g+m,b+m],-1)
def masks(rgb):
    h,s,v=rgb2hsv(rgb)
    from scipy import ndimage
    blue=(h>=200)&(h<=252)&(s>0.55)&(v>0.28)
    red=((h>=338)|(h<=8))&(s>0.78)&(v>0.38)
    redL=((h>=325)|(h<=14))&(s>0.22)&(v>0.35)
    blueL=(h>=195)&(h<=258)&(s>0.25)&(v>0.3)
    red=red|(redL&ndimage.binary_dilation(red,iterations=5))
    blue=blue|(blueL&ndimage.binary_dilation(blue,iterations=5))
    return h,s,v,blue,red
def swap(img,protect=()):
    a=np.array(img);rgb=a[...,:3]
    h,s,v,blue,red=masks(rgb)
    pm=np.zeros(blue.shape,bool)
    yy,xx=np.mgrid[:blue.shape[0],:blue.shape[1]]
    W=img.width/1536
    for (cx,cy,r) in protect: pm|=(xx-cx*W)**2+(yy-cy*W)**2<(r*W)**2
    blue&=~pm;red&=~pm
    nh=h.copy();nh[blue]=356;nh[red]=224
    # keep perceived lightness roughly: boost red v slightly down, blue up
    nv=v.copy();nv[blue]=np.clip(v[blue]*1.0,0,1);nv[red]=np.clip(v[red]*0.92,0,1)
    out=hsv2rgb(nh,s,nv);res=rgb.astype(np.float32)/255
    m=(blue|red)[...,None];res=np.where(m,out,res)
    a2=a.copy();a2[...,:3]=(res*255).clip(0,255).astype(np.uint8);return Image.fromarray(a2,img.mode)
def save(img,name,q=80):
    img.save(OUT+name+'.webp','WEBP',quality=q,method=6);return os.path.getsize(OUT+name+'.webp')
meta={};total=0
# background
bg=Image.open(IM+'8.jpg').convert('RGB')
total+=save(bg,'bg_a',82);total+=save(swap(bg),'bg_b',82)
# sprites (cutouts made earlier). 02 drawn as LHP -> mirror to RHP
SP='assets/'
spr={'p_set':ImageOps.mirror(Image.open(SP+'02_pitcher_set.png')),'p_rel':Image.open(SP+'03_pitcher_release.png'),
     'b_stance':Image.open(SP+'04_batter_stance.png'),'b_swing':Image.open(SP+'05_batter_swing.png')}
for k,im in spr.items():
    im=im.convert('RGBA');sc=900/im.height if im.height>900 else 1
    im=im.resize((round(im.width*sc),round(im.height*sc)),Image.LANCZOS)
    al=np.array(im)[...,3];band=al[int(im.height*0.9):]>128;xs=np.where(band.any(0))[0]
    meta[k]={'w':im.width,'h':im.height,'fmin':int(xs.min()),'fmax':int(xs.max())}
    total+=save(im,k+'_a',85);total+=save(swap(im),k+'_b',85)
# cut-ins
cut={'c06_impact':('9.webp',[(300,700,140)]),'c07_mitt':('10.webp',[(805,615,210)]),'c08_strike':('19.webp',None),'c09_k':('12.webp',None),
'c10_walk':('26.webp',[]),'c11_grounder':('29.webp',[(778,822,75)]),'c12_fly':('30.webp',[(1240,100,50)]),'c13_bunt':('25.webp',[(488,488,60)]),
'c14_slide':('31.webp',[]),'c15_out':('21.webp',None),'c16_safe':('22.webp',None),'c17_dp':('23.webp',[(1248,88,40)]),'c18_celebrate':('24.webp',[])}
for k,(f,prot) in cut.items():
    im=Image.open(IM+f).convert('RGB')
    if k=='c14_slide':  # blur the lettering on the back wall (upper band, away from players)
        a=np.array(im).astype(np.float32);bl=np.array(im.filter(ImageFilter.GaussianBlur(28))).astype(np.float32)
        H,W=a.shape[:2];yy=np.arange(H)[:,None]/H
        m=np.clip((0.47-yy)/0.12,0,1)[...,None]*np.ones((1,W,1))
        # keep the fielder's cap/head and runner's raised hand sharp
        mm=np.ones((H,W),np.float32)
        for (x0,y0,x1,y1) in [(290,90,620,370),(1110,140,1240,300),(1290,270,1520,490)]:
            mm[y0:y1,x0:x1]=0
        mm=np.array(Image.fromarray((mm*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(20)))/255.0
        m=m*mm[...,None]
        out=a*(1-m)+(bl*0.55)*m;im=Image.fromarray(out.clip(0,255).astype(np.uint8))
    if k=='c18_celebrate':  # paint the stray blue wristband red (offense colour)
        a=np.array(im);h,s,v,blue,red=masks(a);box=np.zeros(blue.shape,bool);box[650:830,600:780]=True
        sel=blue&box;hh,ss,vv=rgb2hsv(a);hh[sel]=356;rr=hsv2rgb(hh,ss,vv);a[sel]=(rr[sel]*255).astype(np.uint8);im=Image.fromarray(a)
    im=im.resize((1280,round(im.height*1280/im.width)),Image.LANCZOS)
    total+=save(im,k+'_a',80)
    if prot is not None: total+=save(swap(im,prot),k+'_b',80)
json.dump(meta,open(OUT+'meta.json','w'))
print('total KB',total//1024);print(meta)
