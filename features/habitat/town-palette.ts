/** Public World inherits CTRL's existing Common Ground material language.
 * Values sampled from features/plaza/architecture.tsx, not a new pastel theme.
 * Keeping these town-only avoids changing the approved walletless landing.
 */
export const TOWN_PALETTE={
 cream:'#e9dec8',wall:'#ded2b9',trim:'#e5d7ba',pot:'#ddcfb2',
 terracotta:'#ba7759',pavers:['#b9846a','#c99175','#bb8364','#cb977c'],
 forest:'#3c5049',sage:'#69836c',shutter:'#7c8d79',wood:'#b08c58',
 foliage:['#3c5049','#576f5e','#69836c','#798c75'],grass:'#798c75',
 sky:'#c4d9df',water:'#75a5ae',blossoms:['#ba7759','#c99175','#cb977c','#e9dec8'],
} as const;
