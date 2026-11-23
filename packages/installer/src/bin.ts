#!/usr/bin/env bun
import { dispatch } from "./cli";

dispatch(process.argv.slice(2))
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    console.error(`UltraCode: ${(error as Error).message}`);
    process.exitCode = 1;
  });
