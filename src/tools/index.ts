import { readFile } from "./readFile";
import { writeFile } from "./writeFile";
import { editFile } from "./editFile";
import { readDocx } from "./readDocx";
import { execCommand } from "./execCommand";

export const allTools = [
    readFile,
    writeFile,
    editFile,
    readDocx,
    execCommand,
];