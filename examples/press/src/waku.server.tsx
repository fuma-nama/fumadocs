import adapter from 'waku/adapters/default';
import pressConfig from '../press.config';
import { createRouter } from '@fumapress/core/router';

const router = createRouter(pressConfig);

export default adapter(router.createPages());
