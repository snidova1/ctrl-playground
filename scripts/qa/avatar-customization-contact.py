import json
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw
root=Path('test-results/avatar-customization')
report=json.loads((root/'report.json').read_text()) if (root/'report.json').exists() else None
items=report['screenshots'] if report else [{'name':p.stem,'path':str(p)} for p in sorted(root.glob('*.png'))]

def sheet(name,selected,cols,w,h):
    rows=(len(selected)+cols-1)//cols
    canvas=Image.new('RGB',(cols*w,rows*(h+55)+65),'#f5f1e7')
    d=ImageDraw.Draw(canvas)
    d.text((18,16),name+' | ACTUAL Chromium SwiftShader screenshots',fill='#344b40')
    d.text((18,36),'Render verification only - not acceptance. Male studio = historically rejected Fumiriya.',fill='#8c3535')
    for i,item in enumerate(selected):
        im=Image.open(item['path']).convert('RGB')
        thumb=ImageOps.contain(im,(w-16,h-8))
        x=(i%cols)*w+(w-thumb.width)//2;y=65+(i//cols)*(h+55)
        canvas.paste(thumb,(x,y))
        d.text(((i%cols)*w+8,y+h+3),item['name'],fill='#344b40')
    path=root/(name+'.jpg');canvas.save(path,quality=92)
    return str(path)
main=[i for i in items if (i['name'].startswith('desktop-') and any(s in i['name'] for s in ['clean','styled','random'])) or i['name'].endswith('-stage')]
accessories=[i for i in items if i['name'].startswith('accessory-')]
expressions=[i for i in items if i['name'].startswith('expression-')]
paths=[sheet('contact-sheet',main,3,440,500),sheet('accessories-contact-sheet',accessories,5,340,390),sheet('expressions-contact-sheet',expressions,5,340,390)]
if report:
    report['contactSheets']=paths
    (root/'report.json').write_text(json.dumps(report,indent=2))
print(json.dumps({'screenshots':len(items),'contactSheets':paths,'checks':len(report['checks']) if report else 'run pending','failedChecks':[i for i in report['checks'] if not i['pass']] if report else None,'fatal':report['fatal'] if report else None},indent=2))
