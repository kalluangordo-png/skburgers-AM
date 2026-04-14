import React from 'react';
import { Order } from '../../types';
import { formatCurrency, getAddonEmoji } from '../../utils';

interface PrintTicketProps {
  order: Order;
}

const PrintTicket: React.FC<PrintTicketProps> = ({ order }) => {
  const date = order.dataCriacao?.toDate ? order.dataCriacao.toDate() : new Date(order.dataCriacao);

  return (
    /* Mantemos 'hidden' para não afetar o layout do Admin, mas visível para o window.print() */
    <div className="hidden print:block">
      <div 
        id={`print-ticket-${order.id}`} 
        className="w-[58mm] md:w-[80mm] bg-white text-black p-1 font-mono text-[11px] leading-[1.1]"
      >
        {/* Cabeçalho Industrial */}
        <div className="text-center border-b-2 border-black pb-2 mb-2">
          <p className="text-[9px] uppercase font-bold">Manaus - Premium Burgers</p>
          <div className="flex justify-between mt-2 text-[10px] font-bold border-y border-black py-1">
            <span>#{order.numeroComanda}</span>
            <span>{date.toLocaleDateString('pt-BR')} {date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>

        {/* Dados de Entrega / Retirada */}
        <div className="mb-2 border-b border-dashed border-black pb-2">
          <p className="font-black text-[12px]">{order.cliente.nome.toUpperCase()}</p>
          <p>WHATS: {order.cliente.whatsapp || order.customerPhone}</p>
          <p className="mt-1 leading-tight">
            <span className="font-bold">END:</span> {order.cliente.endereco || order.address || 'RETIRADA NO BALCÃO'}
          </p>
          {order.cliente.bairro && <p><span className="font-bold">BAIRRO:</span> {order.cliente.bairro.toUpperCase()}</p>}
        </div>

        {/* Itens - Onde o Chapeiro foca */}
        <div className="mb-2">
          <p className="font-black text-center border border-black mb-2 py-0.5">RESUMO DO PEDIDO</p>
          {order.itens.map((item, idx) => (
            <div key={idx} className="mb-3 border-b border-zinc-100 pb-1">
              <div className="flex justify-between items-start">
                <span className="font-black text-[12px] flex-1">
                  {item.qtd}x {item.name.toUpperCase()} 
                  {item.isCombo ? " [COMBO]" : ""}
                </span>
                <span className="font-bold ml-2">{formatCurrency(item.price * item.qtd)}</span>
              </div>

              {/* Extras em destaque */}
              {item.addons?.map((addon, aIdx) => (
                <p key={aIdx} className="pl-3 text-[10px] font-black uppercase flex items-center gap-1">
                  {getAddonEmoji(addon.name)} EXTRA: {addon.name}
                </p>
              ))}

              {/* Observações Cruciais */}
              {item.obsExtras?.map((obs, oIdx) => (
                <div key={oIdx} className="mt-1 pl-2 bg-black text-white px-1 font-bold text-[10px]">
                  * {obs.toUpperCase()}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Fechamento de Conta */}
        <div className="border-t-2 border-black pt-2 space-y-1">
          <div className="flex justify-between">
            <span>SUBTOTAL:</span>
            <span>{formatCurrency(order.subtotal || order.total)}</span>
          </div>
          <div className="flex justify-between">
            <span>TAXA ENTREGA:</span>
            <span>{formatCurrency(order.taxaEntrega || 0)}</span>
          </div>
          {(order.taxas && order.taxas !== 0) ? (
            <div className="flex justify-between italic">
              <span>DESC/ACRESC:</span>
              <span>{formatCurrency(order.taxas)}</span>
            </div>
          ) : null}
          <div className="flex justify-between text-[14px] font-black border-t border-black mt-1 pt-1">
            <span>TOTAL:</span>
            <span>{formatCurrency(order.total)}</span>
          </div>
        </div>

        {/* Pagamento */}
        <div className="mt-3 p-1 border border-black text-center">
          <p className="font-black uppercase text-[12px]">PAGTO: {order.pagamento}</p>
          {(order as any).trocoPara && (
            <p className="font-black text-[11px] mt-1 bg-black text-white py-0.5">
              LEVAR TROCO PARA: {formatCurrency((order as any).trocoPara)}
            </p>
          )}
        </div>

        {/* Rodapé */}
        <div className="text-center mt-6 text-[9px] uppercase font-bold">
          <p>Feito com brasa e paixão 🔥</p>
          <p>www.skburgers.com.br</p>
        </div>
      </div>
    </div>
  );
};

export default PrintTicket;
