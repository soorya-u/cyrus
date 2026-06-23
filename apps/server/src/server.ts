import { app } from "./index";

export default { fetch: app.handle.bind(app) };
