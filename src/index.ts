#! /usr/bin/env node

import "babel-polyfill";
import Shuffler from "./shuffler";

(async () => {
    await new Shuffler().run();
    process.exit();
})();
