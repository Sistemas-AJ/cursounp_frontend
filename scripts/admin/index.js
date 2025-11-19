import { initTabs } from './tabs.js';
import { initSessionModule } from './sessionModule.js';
import { initMaterialModule } from './materialModule.js';
import { initTaskModule } from './taskModule.js';
import { initAuthModule } from './authModule.js';

initTabs();
initAuthModule();
initSessionModule();
initMaterialModule();
initTaskModule();
