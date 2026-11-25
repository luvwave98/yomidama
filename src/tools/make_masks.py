import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage
A='yomidama/assets/'
def rgb2hsv(a):
    a=a.astype(np.float32)/255;r,g,b=a[...,0],a[...,1],a[...,2]
    mx=a.max(-1);mn=a.min(-1);d=mx-mn+1e-6
    h=np.where(mx==r,((g-b)/d)%6,np.where(mx==g,(b-r)/d+2,(r-g)/d+4))*60
    s=np.where(mx>0,(mx-mn)/(mx+1e-6),0);return h,s,mx
def masks(rgb):
    h,s,v=rgb2hsv(rgb)
    blue=(h>=200)&(h<=252)&(s>0.55)&(v>0.28)
    red=((h>=338)|(h<=8))&(s>0.78)&(v>0.38)
    redL=((h>=325)|(h<=14))&(s>0.22)&(v>0.35)
    blueL=(h>=195)&(h<=258)&(s>0.25)&(v>0.3)
    red=red|(redL&ndimage.binary_dilation(red,iterations=5))
    blue=blue|(blueL&ndimage.binary_dilation(blue,iterations=5))
    return blue,red
PROT={'c06_impact':[(300,700,140)],'c07_mitt':[(805,615,210)],'c11_grounder':[(778,822,75)],'c12_fly':[(1240,100,50)],'c13_bunt':[(488,488,60)],'c17_dp':[(1248,88,40)]}
names=['bg','p_set','p_rel','b_stance','b_swing','c06_impact','c07_mitt','c10_walk','c11_grounder','c12_fly','c13_bunt','c14_slide','c17_dp','c18_celebrate']
tot=0
for n in names:
    im=Image.open(A+n+'_a.webp').convert('RGBA');a=np.array(im)
    blue,red=masks(a[...,:3])
    if a[...,3].min()<255: alpha=a[...,3]>0;blue&=alpha;red&=alpha
    yy,xx=np.mgrid[:blue.shape[0],:blue.shape[1]];W=im.width/1536
    for (cx,cy,r) in PROT.get(n,[]):
        pm=(xx-cx*W)**2+(yy-cy*W)**2<(r*W)**2;blue&=~pm;red&=~pm
    m=np.zeros(a.shape[:2]+(3,),np.uint8);m[...,0]=blue*255;m[...,1]=red*255
    out=Image.fromarray(m).filter(ImageFilter.GaussianBlur(.7))
    out.save(A+'mask_'+n+'.png',optimize=True)
    import os;sz=os.path.getsize(A+'mask_'+n+'.png');tot+=sz;print(n,sz//1024,'KB')
print('total',tot//1024,'KB')
