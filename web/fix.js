const fs = require('fs');
const file = 'c:\\Projetos\\GF\\web\\src\\app\\(dashboard)\\transacoes\\page.tsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(
  'max-w-xl rounded-sm shadow-2xl overflow-hidden animate-in', 
  'max-w-xl rounded-sm shadow-2xl overflow-hidden animate-in flex flex-col max-h-[90vh]'
);
c = c.replace(
  'px-10 py-8 bg-slate-50 border-b border-slate-100 flex items-center justify-between', 
  'px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between'
);
c = c.replace(
  '<form onSubmit={confirmarEnvio} className="p-10 space-y-6">', 
  '<div className="flex-1 overflow-y-auto custom-scrollbar p-6"><form onSubmit={confirmarEnvio} className="space-y-4">'
);
c = c.replace(
  '</form>\n          </div>\n        </div>\n      )}', 
  '</form>\n            </div>\n          </div>\n        </div>\n      )}'
);
c = c.replace(/py-4 rounded-sm text-\[10px\]/g, 'py-3 rounded-sm text-[10px]');
c = c.replace(/py-5 bg-slate-50/g, 'py-3 bg-slate-50');
c = c.replace('grid grid-cols-2 gap-6', 'grid grid-cols-2 gap-4');
c = c.replace('pt-8 flex items-center justify-end gap-4', 'pt-4 flex items-center justify-end gap-3');
c = c.replace('px-10 py-4 bg-[#1351b4]', 'px-6 py-3 bg-[#1351b4]');

fs.writeFileSync(file, c, 'utf8');
