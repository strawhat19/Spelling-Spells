import GrimoirePage from '../src/components/GrimoirePage';
import { GrimoireProvider } from '../src/shared/grimoire/GrimoireContext';

const GrimoireRoute = () => <GrimoireProvider><GrimoirePage /></GrimoireProvider>;

export default GrimoireRoute;
