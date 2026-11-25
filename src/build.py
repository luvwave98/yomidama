import base64, glob, os, json
s=open('logic.js').read();snd=open('sound.js').read();meta=open('assets/meta.json').read();head=open('head.html').read();u=open('ui.js').read()
b64=lambda f,t:f'data:{t};base64,'+base64.b64encode(open(f,'rb').read()).decode()
assets={os.path.basename(f)[:-7]:b64(f,'image/webp') for f in sorted(glob.glob('assets/*_a.webp'))}
masks={os.path.basename(f)[5:-4]:b64(f,'image/png') for f in sorted(glob.glob('assets/mask_*.png'))}
out=(head+"\n<script>\n"+s+"\nconst META="+meta+";\nconst ASSETS="+json.dumps(assets)+";\nconst MASKS="+json.dumps(masks)+";\n</script>\n<script>\n"+snd+"</script>\n<script>\n"+u+"</script>\n")
open('index.html','w').write(out);open('yomidama.html','w').write(out)
print('built',round(len(out)/1024/1024,2),'MB',len(assets),'images',len(masks),'masks')
