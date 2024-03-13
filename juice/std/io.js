import node_fs from "node:fs";

export const stdout = {
	write: (string) => {
		process.stdout.write(string);
	},
};

export const debug = (value) => {
	console.log(value);
};

export const get_process_arguments = () => {
	return process.argv.slice(2);
};

export const read_file = (path) => {
	return node_fs.readFileSync(path, "utf-8");
};
