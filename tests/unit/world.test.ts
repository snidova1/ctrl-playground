import {describe,it,expect} from 'vitest';
import {worldRecipeSchema,recipeFromCommand,worldStateSchema} from '@/domain/world';
const recipe={version:1,title:'A garden of lost ideas',brief:'Explore the garden and grow three unusual ideas.',kit:'internet-weather',objects:['Question','Map','Invitation'],accent:'mint'};
describe('bounded world runtime',()=>{
 it('preserves a custom recipe instead of substituting a static exhibition',()=>{expect(recipeFromCommand('Build a living garden.','dead-web',JSON.stringify(recipe))).toEqual(recipe);});
 it('rejects executable fields and unregistered renderers',()=>{expect(worldRecipeSchema.safeParse({...recipe,script:'fetch(secret)'}).success).toBe(false);expect(worldRecipeSchema.safeParse({...recipe,kit:'remote-script'}).success).toBe(false);});
 it('bounds object count and restored position',()=>{expect(worldRecipeSchema.safeParse({...recipe,objects:Array(10).fill('thing')}).success).toBe(false);expect(worldStateSchema.safeParse({activated:[0],hour:12,wind:40,position:[999,0]}).success).toBe(false);});
});
