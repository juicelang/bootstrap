String.prototype.starts_with = String.prototype.startsWith;

String.prototype.slice = String.prototype.substring;

globalThis.juice = {
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
};
