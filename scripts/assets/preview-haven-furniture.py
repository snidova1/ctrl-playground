import requests,concurrent.futures,io,json
from PIL import Image,ImageDraw
from pathlib import Path
ids='sofa_02 sofa_03 mid_century_lounge_chair modern_arm_chair_01 coffee_table_round_01 modern_coffee_table_01 modern_wooden_cabinet chinese_cabinet chinese_tea_table vintage_day_bed painted_wooden_bench outdoor_table_chair_set_01 wooden_picnic_table potted_plant_01 potted_plant_02 potted_plant_04 planter_box_01 planter_box_02 planter_box_03 vintage_oil_lamp watering_can_metal_01 Rockingchair_01 gallinera_chair round_wooden_table_01'.split()
out=Path('test-results/new-furniture');out.mkdir(parents=True,exist_ok=True)
def one(k):
 d=requests.get('https://api.polyhaven.com/info/'+k,timeout=30).json()
 r=requests.get(d['thumbnail_url'],timeout=30);r.raise_for_status()
 im=Image.open(io.BytesIO(r.content)).convert('RGBA');im.thumbnail((210,190))
 return k,d,im
canvas=Image.new('RGB',(1000,6*225),'#eee9dd');draw=ImageDraw.Draw(canvas);all=[]
for i,(k,d,im) in enumerate(concurrent.futures.ThreadPoolExecutor(4).map(one,ids)):
 x=(i%4)*250;y=(i//4)*225;canvas.paste(im,(x+20,y),im);draw.text((x+5,y+192),k,fill='#303830');draw.text((x+5,y+208),str(d.get('polycount'))+' polygons',fill='#303830');all.append({'id':k,**d})
canvas.save(out/'haven-candidates.jpg');(out/'candidates.json').write_text(json.dumps(all,indent=2));print(out/'haven-candidates.jpg')
