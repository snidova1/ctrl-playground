import {describe,it,expect} from 'vitest';
import {townActivityLabel} from '@/domain/town-activity-label';
describe('honest saved activity labels',()=>{
 it.each([
  ['completed','Completed work'],['started','Started work'],['cancelled','Cancelled work'],
  ['route-stop','Finished route stop'],['plant','Planted seeds'],['water','Watered flowers'],['harvest','Harvested flowers'],
  ['dance','Danced together'],['high-five','High five'],['sat','Sat down'],['stood','Stood up'],
  ['gathering-hosted','Hosted a gathering'],['gathering-attended','Attended a gathering'],
  ['switched on','Switched on'],['switched off','Switched off'],
 ])('labels %s without inventing a completed job',(kind,label)=>expect(townActivityLabel(kind)).toBe(label));
 it('does not label unknown events as completed work or inherit object properties',()=>{
  for(const kind of ['future-event','__proto__','constructor'])expect(townActivityLabel(kind)).toBe('Recorded activity');
 });
});
