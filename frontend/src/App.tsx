import { Biblioteca } from "./paginas/Biblioteca";
import { Cadastro } from "./paginas/Cadastro";
import { Editor } from "./paginas/Editor";
import { Jogadores } from "./paginas/Jogadores";
import { Login } from "./paginas/Login";
import { SelecaoMapa } from "./paginas/SelecaoMapa";
import { Status } from "./paginas/Status";
import { Redirecionar, useCaminho } from "./roteamento";

export default function App() {
  const caminho = useCaminho();

  if (caminho === "/cadastro") return <Cadastro />;
  if (caminho === "/login") return <Login />;
  if (caminho === "/biblioteca") return <Biblioteca />;
  if (caminho === "/jogadores") return <Jogadores />;
  if (caminho === "/status") return <Status />;
  if (caminho === "/editor") return <SelecaoMapa />;
  // /editor/<mapa>: o key recria o editor ao trocar de mapa, zerando posições e rotação.
  if (caminho.startsWith("/editor/")) {
    const mapaId = decodificar(caminho.slice("/editor/".length));
    return <Editor key={mapaId} mapaId={mapaId} />;
  }

  // "/" e qualquer rota desconhecida vão para o login.
  return <Redirecionar para="/login" />;
}

// Caminho malformado (ex.: "%E0") vira id vazio, e o editor mostra "Mapa não encontrado".
function decodificar(trecho: string): string {
  try {
    return decodeURIComponent(trecho);
  } catch {
    return "";
  }
}
