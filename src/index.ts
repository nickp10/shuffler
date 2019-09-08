import "core-js/stable";
import "regenerator-runtime/runtime";
import Shuffler from "./shuffler";

(async () => {
    await new Shuffler().run();
    process.exit();
})();
