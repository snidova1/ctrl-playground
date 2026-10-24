import type {CharacterExpressionController} from './expression-controller';
import type {CharacterGesture} from './animation';
/** Route a body's temporary gesture mood through the same single face owner.
 * Unsupported morphs restore the creator baseline rather than leaving the
 * previous gesture's mood stuck. No new timers, VRM updates or morph writers.
 */
export function syncGestureExpression(controller:Pick<CharacterExpressionController,'setExpression'|'resetExpression'>,previous:CharacterGesture|null,current:CharacterGesture|null):CharacterGesture|null{
 if(previous===current)return current;
 if(current===null||!controller.setExpression(current==='victory'?'happy':'relaxed'))controller.resetExpression();
 return current;
}
