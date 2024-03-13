export const is_juice_type = (value) => {
	return value !== null && value !== undefined && value._type !== undefined;
};

export const juice_types_match = (a, b) => {
	return a._type === b._type;
};
