import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import ElementPlus from "element-plus";
import zhCn from "element-plus/es/locale/lang/zh-cn";
import "element-plus/dist/index.css";
import "./styles/style.css";
import { createPinia } from "pinia";
import "vue3-toastify/dist/index.css";

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.use(ElementPlus, {
  locale: zhCn,
});
app.mount("#app");
