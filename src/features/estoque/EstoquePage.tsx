import { CabecalhoPagina } from '@/components/ui/estrutura'
import { Insumos } from './Insumos'

export function EstoquePage() {
  return (
    <div className="space-y-5">
      <CabecalhoPagina titulo="Estoque" descricao="Ingredientes e embalagens, com entradas, saídas e histórico de cada item." />
      <Insumos />
    </div>
  )
}
