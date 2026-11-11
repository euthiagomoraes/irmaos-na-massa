import { CabecalhoPagina } from '@/components/ui/estrutura'
import { Insumos } from './Insumos'

export function EstoquePage() {
  return (
    <div className="space-y-5">
      <CabecalhoPagina titulo="Estoque" descricao="Insumos e embalagens separados, com entradas, saídas e histórico." />
      <Insumos />
    </div>
  )
}
