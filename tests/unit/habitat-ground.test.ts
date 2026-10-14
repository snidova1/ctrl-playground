import {it,expect} from 'vitest';
import {BoxGeometry} from 'three';
import {HABITAT_BASE_Y,HABITAT_BASE_HEIGHT} from '@/features/habitat/habitat-ground';
it('keeps every foundation vertex below the unchanged y=0 playable floor',()=>{
 const geometry=new BoxGeometry(32,HABITAT_BASE_HEIGHT,24),positions=geometry.getAttribute('position');
 for(let i=0;i<positions.count;i++)expect(positions.getY(i)+HABITAT_BASE_Y).toBeLessThan(-.015);
 geometry.dispose();
});
