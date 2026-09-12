import fs from 'node:fs/promises';
import path from 'node:path';
import {Workspace} from '../workspace.mjs';
export default {id:'workspace',activate(ctx,config){return fs.realpath(process.env.WORKSPACE || path.join(config.base,'example')).then(root=>{ctx.provide('workspace',new Workspace(root));});}};
