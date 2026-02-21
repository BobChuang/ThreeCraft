'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.clampSurvivalState = void 0;
const clamp = (value, min, max) => {
	if (value < min) return min;
	if (value > max) return max;
	return value;
};
const clampSurvivalState = state => ({
	...state,
	hp: clamp(state.hp, 0, state.maxHp),
	hunger: clamp(state.hunger, 0, state.maxHunger),
});
exports.clampSurvivalState = clampSurvivalState;
