String.prototype.starts_with = String.prototype.startsWith;

String.prototype.slice = String.prototype.substring;

String._is_ctor = true;
String._type = "internal@string";
String.prototype._type = String._type;

Number.prototype.to_string = Number.prototype.toString;

Number._is_ctor = true;
Number._type = "internal@number";
Number.prototype._type = Number._type;

Array._is_ctor = true;
Array._type = "internal@array";
Array.prototype._type = Array._type;

globalThis.string = String;
globalThis.number = Number;
globalThis.list = Array;

globalThis.juice = {
	is_juice_type: (value) => value && value._type,
	is_result_type: (value) => {
		return (
			value &&
			(value._type === "dev.juice.std.types.result@result#ok" ||
				value._type === "dev.juice.std.types.result@result#error")
		);
	},
	is_result_ok: (value) => {
		return value && value._type === "dev.juice.std.types.result@result#ok";
	},
	unwrap_result: (value) => {
		return value.value;
	},

	match: (source, target) => {
		const is_source_juice_type = globalThis.juice.is_juice_type(source);
		const is_target_juice_type = globalThis.juice.is_juice_type(target);

		if (is_source_juice_type !== is_target_juice_type) {
			return false;
		}

		if (is_source_juice_type && target._is_ctor) {
			return source._type === target._type;
		}

		return source === target;
	},

	pretty: (value) => {
		if (typeof value === "string") {
			return `"${value}"`;
		}

		return value.toString();
	},
};
