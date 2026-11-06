import { Biblioteca } from "./paginas/Biblioteca";
import { Cadastro } from "./paginas/Cadastro";
import { Jogadores } from "./paginas/Jogadores";
import { Login } from "./paginas/Login";
import { Status } from "./paginas/Status";
import { Redirecionar, useCaminho } from "./roteamento";

export default function App() {
  const caminho = useCaminho();

  if (caminho === "/cadastro") return <Cadastro />;
  if (caminho === "/login") return <Login />;
  if (caminho === "/biblioteca") return <Biblioteca />;
  if (caminho === "/jogadores") return <Jogadores />;
  if (caminho === "/status") return <Status />;

  // "/" e qualquer rota desconhecida vão para o login.
  return <Redirecionar para="/login" />;
}
