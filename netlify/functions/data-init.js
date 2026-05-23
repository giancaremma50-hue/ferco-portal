const { validatePassword } = require('./_shared/auth');
const { setCountryData } = require('./_shared/blobs');

function row(suc, nom, vals, nota) {
  return { canal: '', region: '', zona: '', sucursal: suc, nombre: nom, valores: vals, nota: nota || '' };
}

const BDO_COLS = ['QR Griferia','QR Losa','QR SPC','QR Cerámica','Video Griferia','Video de Losa','Video de SPC','Video Cerámica'];
function b(qg,ql,qs,qc,vg,vl,vs,vc){ return {'QR Griferia':qg,'QR Losa':ql,'QR SPC':qs,'QR Cerámica':qc,'Video Griferia':vg,'Video de Losa':vl,'Video de SPC':vs,'Video Cerámica':vc}; }
function s(s1,s2,s3){ return {'Sesión 1':s1,'Sesión 2':s2,'Sesión 3':s3}; }

const HN_BDO = [
  row('Choluteca','Jesus Contreras Canales',b(100,100,0,0,100,100,0,0)),
  row('Choluteca','Hellen María Lobo',b(100,100,0,0,100,100,0,0)),
  row('Choluteca','Luis Antonio Maradiaga Ponce',b(100,0,0,0,100,100,0,0)),
  row('Comayagua','Reina Mitchelle Coello',b(100,100,100,100,0,0,0,0)),
  row('Comayagua','Laura Elena Oviedo Castillo',b(100,100,100,100,100,100,0,0)),
  row('Comayagua','Astrid Ninoska López Hernández',b(100,100,0,80,100,100,0,0)),
  row('Comayagua','Kimberly Jarisel Jimenez',b(100,100,100,100,100,100,0,0)),
  row('Juticalpa','Sayda Yasmin Miralda Bueso',b(100,100,75,100,0,0,0,0)),
  row('Juticalpa','Gabriel Alejandro Fuentes Reales',b(100,100,100,80,100,0,0,0)),
  row('La Ceiba','Victor Enrique Cordova Delcid',b(100,100,100,0,0,0,0,0)),
  row('La Ceiba','Jorge Alberto Matute Montecinos',b(100,1.2,100,0,0,0,0,0)),
  row('La Ceiba','José A Castellanos',b(100,80,100,0,0,0,0,0)),
  row('La Ceiba','Karen Elizabeth Ortiz Figueroa',b(100,80,100,0,0,0,0,0)),
  row('Proyectos','Jose Blas Domínguez Duron',b(100,0,0,0,0,0,0,0)),
  row('Proyectos','Martha Elena Flores Lopez',b(100,0,0,0,0,0,0,0)),
  row('Proyectos','Sheryll Elizabeth Medina Aguilar',b(0,0,0,0,0,0,0,0)),
  row('Proyectos','Cristel Eliuth Giron Lopez',b(80,0,0,0,0,0,0,0)),
  row('Proyectos','Helena Suazo',b(100,0,0,0,0,0,0,0)),
  row('Proyectos','Alejandra Daniela Lozano Rodriguez',b(100,0,0,0,0,0,0,0)),
  row('Roatan','Argel Mejia',b(0,0,0,0,0,0,0,0)),
  row('San Lorenzo','Stephany Nicole Oseguera García',b(100,1.2,100,0,100,100,0,0)),
  row('San Lorenzo','Iris Dariela Baquedano Marcia',b(100,100,100,0,0,0,0,0)),
  row('San Pedro Sula','Gabriela Paola Rivera Escoto',b(100,0,0,0,0,0,0,0)),
  row('San Pedro Sula','Ada Faviola Cano Carvajal',b(80,0,0,0,0,0,0,0)),
  row('San Pedro Sula','Mauricio Salvador Aguilar García',b(100,0,0,0,0,0,0,0)),
  row('San Pedro Sula','Wendy Paz',b(100,0,0,100,0,0,0,0)),
  row('Tegucigalpa','Josseline Gisselle Rivera Herrera',b(100,100,100,0,0,0,0,0)),
  row('Tegucigalpa','Heidy Arely Tejeda Vásquez',b(100,100,100,0,100,100,100,0)),
  row('Tegucigalpa','Jorge Ponce',b(100,100,100,0,100,100,100,0)),
  row('Tegucigalpa','Jhissell Alejandra Zuniga Argueta',b(0,100,100,0,0,100,100,0)),
  row('Tegucigalpa','Victor Gonzales',b(100,100,100,0,100,100,100,0)),
  row('Tegucigalpa','Sheyla Tennelly Mairena Andino',b(80,100,100,0,100,100,100,0)),
  row('Tegucigalpa','Cintia Carolina Núñez Perdomo',b(100,100,100,0,100,100,100,0)),
];

const HN_X4X = [
  row('Choluteca','Jesus Contreras Canales',s(100,100,0)),
  row('Choluteca','Hellen María Lobo',s(100,100,0)),
  row('Choluteca','Luis Antonio Maradiaga Ponce',s(100,100,0)),
  row('Comayagua','Reina Mitchelle Coello',s(100,100,100)),
  row('Comayagua','Laura Elena Oviedo Castillo',s(100,100,0)),
  row('Comayagua','Astrid Ninoska López Hernández',s(100,100,0)),
  row('Comayagua','Kimberly Jarisel Jimenez',s(100,100,0)),
  row('Juticalpa','Skarlet vanessa rosales Ramos',s(0,0,100)),
  row('Juticalpa','Sayda Yasmin Miralda Bueso',s(100,100,85.71)),
  row('Juticalpa','Gabriel Alejandro Fuentes Reales',s(100,100,100)),
  row('La Ceiba','Victor Enrique Cordova Delcid',s(100,100,85.71)),
  row('La Ceiba','Jorge Alberto Matute Montecinos',s(100,100,100)),
  row('La Ceiba','José A Castellanos',s(100,85.71,85.71)),
  row('La Ceiba','Karen Elizabeth Ortiz Figueroa',s(100,0,100)),
  row('Proyectos','Jose Blas Domínguez Duron',s(0,0,0)),
  row('Proyectos','Martha Elena Flores Lopez',s(0,0,0)),
  row('Proyectos','Sheryll Elizabeth Medina Aguilar',s(0,0,0)),
  row('Proyectos','Cristel Eliuth Giron Lopez',s(0,0,0)),
  row('Proyectos','Helena Suazo',s(100,0,0)),
  row('Proyectos','Alejandra Daniela Lozano Rodriguez',s(0,0,0)),
  row('Roatan','Argel Mejia',s(100,0,100)),
  row('San Lorenzo','Stephany Nicole Oseguera García',s(100,100,0)),
  row('San Lorenzo','Iris Dariela Baquedano Marcia',s(100,100,100)),
  row('San Pedro Sula','Gabriela Paola Rivera Escoto',s(0,0,85.71)),
  row('San Pedro Sula','Ada Faviola Cano Carvajal',s(0,0,100)),
  row('San Pedro Sula','Mauricio Salvador Aguilar García',s(0,0,85.71)),
  row('San Pedro Sula','Gustavo Adolfo Medina Fernández',s(0,0,85.71)),
  row('San Pedro Sula','Wendy Paz',s(100,0,100)),
  row('Tegucigalpa','Josseline Gisselle Rivera Herrera',s(100,100,100)),
  row('Tegucigalpa','Heidy Arely Tejeda Vásquez',s(0,0,0)),
  row('Tegucigalpa','Jorge Ponce',s(0,0,0)),
  row('Tegucigalpa','Jhissell Alejandra Zuniga Argueta',s(0,0,0)),
  row('Tegucigalpa','Victor Gonzales',s(0,0,0)),
  row('Tegucigalpa','Sheyla Tennelly Mairena Andino',s(0,0,0)),
  row('Tegucigalpa','Cintia Carolina Núñez Perdomo',s(0,0,0)),
];

const SV_X4X = [
  row('Chalatenango','Cristian Edenilson Orellana Erazo',s(100,100,100)),
  row('Chalatenango','Germán Geovani Hernández Soliz',s(100,100,100)),
  row('Chalatenango','Salvador Adrian Aguilera Perez',s(100,100,100)),
  row('Chalatenango','Saúl Antonio López Osorio',s(100,100,85.71)),
  row('Juan Pablo II','Fernando Ventura',s(100,100,0)),
  row('Juan Pablo II','Veronica Elizabeth Garcia de Santos',s(0,0,0)),
  row('Juan Pablo II','Carina Arely Santos',s(100,100,0)),
  row('Juan Pablo II','Jean Carlo Chacon Castro',s(0,0,0)),
  row('Juan Pablo II','Norma Estela Hernandez',s(100,100,0)),
  row('Juan Pablo II','Zulma rosmery galvez cabezas',s(100,100,0)),
  row('Nejapa','Briseyda Yamileth Recinos Hernandez',s(100,100,100)),
  row('Nejapa','Ariel Oswaldo Rivas López',s(100,100,100)),
  row('Nejapa','Anderson Daniel Lopez Acosta',s(100,100,100)),
  row('Nejapa','Norberto Valle',s(100,100,100)),
  row('San Benito','Carlos Antonio Aldana Martínez',s(100,100,85.71)),
  row('San Benito','Lucia Lissett Avendaño de Peña',s(100,100,100)),
  row('San Benito','Luis Roberto Serrano Iraheta',s(100,85.71,0)),
  row('San Benito','Milton Bladimir Landaverde Deras',s(100,100,100)),
  row('San Benito','Andrés Arriaga',s(100,100,100)),
  row('San Miguel','Jorge Alberto Flores',s(0,0,0)),
  row('San Miguel','Luis Fernando Martinez Contreras',s(0,0,0)),
  row('San Miguel','Julia Bernal Lazo',s(0,0,0)),
  row('San Miguel','Rene Mauricio Gomez',s(0,0,0)),
  row('San Miguel','Miguel Angel Alberto Nuñez',s(100,100,100)),
  row('Santa Ana','Oscar Roberto Rosa Rodas',s(100,100,100)),
  row('Santa Ana','Rodolfo Enrique Pozo Nativí',s(100,100,100)),
  row('Santa Ana','Jose Mario Flores',s(100,100,100)),
  row('Santa Ana','Jorge Gustavo Zelaya Martinez',s(100,100,100)),
  row('Sonsonate','Jessica Carolina Olivo Flores',s(100,0,100)),
  row('Sonsonate','Kelvin antonio lima',s(100,0,100)),
  row('Sonsonate','Erick Daniel Portillo Granadeño',s(100,0,100)),
  row('Sonsonate','Kenny Stephanie Consuegra de Ortiz',s(100,100,85.71)),
  row('Usulután','Carlos Osegueda',s(100,100,100)),
  row('Usulután','Eduardo José Cisneros Navarrete',s(100,100,100)),
  row('Usulután','David Salgado',s(100,100,100)),
];

const HN_HISTORICO = {pais:'HN',cortes:[
  {fecha:'2026-04-28',semana:18,mesKey:'2026-04',sucursales:{Choluteca:{bdo_qr:71,bdo_video:50,'4x4_s1':100,'4x4_s2':7},Comayagua:{bdo_qr:89,bdo_video:40,'4x4_s1':100,'4x4_s2':100},Juticalpa:{bdo_qr:71,bdo_video:7,'4x4_s1':92,'4x4_s2':7},'La Ceiba':{bdo_qr:33,bdo_video:0,'4x4_s1':20,'4x4_s2':17},Proyectos:{bdo_qr:27,bdo_video:0,'4x4_s1':17,'4x4_s2':0},Roatan:{bdo_qr:0,bdo_video:0,'4x4_s1':100,'4x4_s2':0},'San Lorenzo':{bdo_qr:73,bdo_video:33,'4x4_s1':70,'4x4_s2':60},'San Pedro Sula':{bdo_qr:37,bdo_video:0,'4x4_s1':26,'4x4_s2':7},Tegucigalpa:{bdo_qr:92,bdo_video:46,'4x4_s1':19,'4x4_s2':17}}},
  {fecha:'2026-04-29',semana:18,mesKey:'2026-04',sucursales:{Choluteca:{bdo_qr:56,bdo_video:50,'4x4_s1':100,'4x4_s2':7},Comayagua:{bdo_qr:91,bdo_video:40,'4x4_s1':100,'4x4_s2':100},Juticalpa:{bdo_qr:91,bdo_video:11,'4x4_s1':92,'4x4_s2':90},'La Ceiba':{bdo_qr:33,bdo_video:0,'4x4_s1':20,'4x4_s2':17},Proyectos:{bdo_qr:27,bdo_video:0,'4x4_s1':17,'4x4_s2':0},Roatan:{bdo_qr:0,bdo_video:0,'4x4_s1':100,'4x4_s2':0},'San Lorenzo':{bdo_qr:73,bdo_video:33,'4x4_s1':88,'4x4_s2':75},'San Pedro Sula':{bdo_qr:37,bdo_video:0,'4x4_s1':17,'4x4_s2':0},Tegucigalpa:{bdo_qr:92,bdo_video:71,'4x4_s1':19,'4x4_s2':17}}},
  {fecha:'2026-04-30',semana:18,mesKey:'2026-04',sucursales:{Choluteca:{bdo_qr:56,bdo_video:50,'4x4_s1':100,'4x4_s2':100},Comayagua:{bdo_qr:91,bdo_video:40,'4x4_s1':100,'4x4_s2':100},Juticalpa:{bdo_qr:91,bdo_video:11,'4x4_s1':92,'4x4_s2':90},'La Ceiba':{bdo_qr:33,bdo_video:0,'4x4_s1':20,'4x4_s2':17},Proyectos:{bdo_qr:27,bdo_video:0,'4x4_s1':17,'4x4_s2':0},Roatan:{bdo_qr:0,bdo_video:0,'4x4_s1':100,'4x4_s2':0},'San Lorenzo':{bdo_qr:73,bdo_video:33,'4x4_s1':88,'4x4_s2':75},'San Pedro Sula':{bdo_qr:37,bdo_video:0,'4x4_s1':26,'4x4_s2':7},Tegucigalpa:{bdo_qr:92,bdo_video:71,'4x4_s1':19,'4x4_s2':17}}},
  {fecha:'2026-05-04',semana:19,mesKey:'2026-05',sucursales:{Choluteca:{bdo_qr:56,bdo_video:67,'4x4_s1':100,'4x4_s2':100},Comayagua:{bdo_qr:92,bdo_video:50,'4x4_s1':100,'4x4_s2':100},Juticalpa:{bdo_qr:96,bdo_video:17,'4x4_s1':100,'4x4_s2':100},'La Ceiba':{bdo_qr:33,bdo_video:0,'4x4_s1':25,'4x4_s2':21},Proyectos:{bdo_qr:27,bdo_video:0,'4x4_s1':17,'4x4_s2':0},Roatan:{bdo_qr:0,bdo_video:0,'4x4_s1':100,'4x4_s2':0},'San Lorenzo':{bdo_qr:89,bdo_video:44,'4x4_s1':100,'4x4_s2':100},'San Pedro Sula':{bdo_qr:32,bdo_video:0,'4x4_s1':20,'4x4_s2':0},Tegucigalpa:{bdo_qr:94,bdo_video:81,'4x4_s1':17,'4x4_s2':17}}},
  {fecha:'2026-05-06',semana:19,mesKey:'2026-05',sucursales:{Choluteca:{bdo_qr:42,bdo_video:38,'4x4_s1':100,'4x4_s2':100,'4x4_s3':0},Comayagua:{bdo_qr:68,bdo_video:30,'4x4_s1':100,'4x4_s2':100,'4x4_s3':0},Juticalpa:{bdo_qr:68,bdo_video:8,'4x4_s1':100,'4x4_s2':100,'4x4_s3':0},'La Ceiba':{bdo_qr:25,bdo_video:0,'4x4_s1':64,'4x4_s2':61,'4x4_s3':0},Proyectos:{bdo_qr:20,bdo_video:0,'4x4_s1':17,'4x4_s2':0,'4x4_s3':0},Roatan:{bdo_qr:0,bdo_video:0,'4x4_s1':100,'4x4_s2':0,'4x4_s3':100},'San Lorenzo':{bdo_qr:48,bdo_video:17,'4x4_s1':83,'4x4_s2':67,'4x4_s3':42},'San Pedro Sula':{bdo_qr:26,bdo_video:0,'4x4_s1':31,'4x4_s2':6,'4x4_s3':29},Tegucigalpa:{bdo_qr:70,bdo_video:53,'4x4_s1':15,'4x4_s2':15,'4x4_s3':15}}},
  {fecha:'2026-05-07',semana:19,mesKey:'2026-05',sucursales:{Choluteca:{bdo_qr:42,bdo_video:38,'4x4_s1':100,'4x4_s2':100,'4x4_s3':0},Comayagua:{bdo_qr:68,bdo_video:30,'4x4_s1':100,'4x4_s2':100,'4x4_s3':0},Juticalpa:{bdo_qr:68,bdo_video:8,'4x4_s1':100,'4x4_s2':100,'4x4_s3':0},'La Ceiba':{bdo_qr:25,bdo_video:0,'4x4_s1':88,'4x4_s2':61,'4x4_s3':0},Proyectos:{bdo_qr:20,bdo_video:0,'4x4_s1':17,'4x4_s2':0,'4x4_s3':0},Roatan:{bdo_qr:0,bdo_video:0,'4x4_s1':100,'4x4_s2':0,'4x4_s3':100},'San Lorenzo':{bdo_qr:48,bdo_video:17,'4x4_s1':83,'4x4_s2':67,'4x4_s3':42},'San Pedro Sula':{bdo_qr:31,bdo_video:0,'4x4_s1':31,'4x4_s2':6,'4x4_s3':29},Tegucigalpa:{bdo_qr:70,bdo_video:53,'4x4_s1':15,'4x4_s2':15,'4x4_s3':15}}},
  {fecha:'2026-05-09',semana:19,mesKey:'2026-05',sucursales:{Choluteca:{bdo_qr:42,bdo_video:38,'4x4_s1':100,'4x4_s2':100,'4x4_s3':0},Comayagua:{bdo_qr:68,bdo_video:30,'4x4_s1':100,'4x4_s2':100,'4x4_s3':0},Juticalpa:{bdo_qr:72,bdo_video:8,'4x4_s1':100,'4x4_s2':100,'4x4_s3':15},'La Ceiba':{bdo_qr:64,bdo_video:0,'4x4_s1':88,'4x4_s2':61,'4x4_s3':82},Proyectos:{bdo_qr:20,bdo_video:0,'4x4_s1':17,'4x4_s2':0,'4x4_s3':0},Roatan:{bdo_qr:0,bdo_video:0,'4x4_s1':100,'4x4_s2':0,'4x4_s3':100},'San Lorenzo':{bdo_qr:48,bdo_video:17,'4x4_s1':83,'4x4_s2':67,'4x4_s3':42},'San Pedro Sula':{bdo_qr:31,bdo_video:0,'4x4_s1':31,'4x4_s2':6,'4x4_s3':29},Tegucigalpa:{bdo_qr:70,bdo_video:53,'4x4_s1':15,'4x4_s2':15,'4x4_s3':15}}},
  {fecha:'2026-05-13',semana:20,mesKey:'2026-05',sucursales:{Choluteca:{bdo_qr:42,bdo_video:50,'4x4_s1':100,'4x4_s2':100,'4x4_s3':0},Comayagua:{bdo_qr:92,bdo_video:38,'4x4_s1':100,'4x4_s2':100,'4x4_s3':0},Juticalpa:{bdo_qr:72,bdo_video:12,'4x4_s1':100,'4x4_s2':100,'4x4_s3':0},'La Ceiba':{bdo_qr:66,bdo_video:0,'4x4_s1':100,'4x4_s2':71,'4x4_s3':93},Proyectos:{bdo_qr:20,bdo_video:0,'4x4_s1':17,'4x4_s2':0,'4x4_s3':0},Roatan:{bdo_qr:0,bdo_video:0,'4x4_s1':100,'4x4_s2':0,'4x4_s3':100},'San Lorenzo':{bdo_qr:63,bdo_video:25,'4x4_s1':100,'4x4_s2':100,'4x4_s3':50},'San Pedro Sula':{bdo_qr:30,bdo_video:0,'4x4_s1':25,'4x4_s2':0,'4x4_s3':25},Tegucigalpa:{bdo_qr:71,bdo_video:61,'4x4_s1':14,'4x4_s2':14,'4x4_s3':14}}},
  {fecha:'2026-05-15',semana:20,mesKey:'2026-05',sucursales:{Choluteca:{bdo_qr:42,bdo_video:50,'4x4_s1':100,'4x4_s2':100,'4x4_s3':0},Comayagua:{bdo_qr:92,bdo_video:38,'4x4_s1':100,'4x4_s2':100,'4x4_s3':0},Juticalpa:{bdo_qr:72,bdo_video:12,'4x4_s1':100,'4x4_s2':100,'4x4_s3':0},'La Ceiba':{bdo_qr:66,bdo_video:0,'4x4_s1':100,'4x4_s2':71,'4x4_s3':93},Proyectos:{bdo_qr:20,bdo_video:0,'4x4_s1':17,'4x4_s2':0,'4x4_s3':0},Roatan:{bdo_qr:0,bdo_video:0,'4x4_s1':100,'4x4_s2':0,'4x4_s3':100},'San Lorenzo':{bdo_qr:63,bdo_video:25,'4x4_s1':100,'4x4_s2':100,'4x4_s3':50},'San Pedro Sula':{bdo_qr:30,bdo_video:0,'4x4_s1':25,'4x4_s2':0,'4x4_s3':25},Tegucigalpa:{bdo_qr:71,bdo_video:61,'4x4_s1':14,'4x4_s2':14,'4x4_s3':14}}},
  {fecha:'2026-05-18',semana:21,mesKey:'2026-05',sucursales:{Choluteca:{bdo_qr:42,bdo_video:50,'4x4_s1':100,'4x4_s2':100,'4x4_s3':0},Comayagua:{bdo_qr:92,bdo_video:38,'4x4_s1':100,'4x4_s2':100,'4x4_s3':0},Juticalpa:{bdo_qr:72,bdo_video:12,'4x4_s1':100,'4x4_s2':100,'4x4_s3':0},'La Ceiba':{bdo_qr:66,bdo_video:0,'4x4_s1':100,'4x4_s2':71,'4x4_s3':93},Proyectos:{bdo_qr:20,bdo_video:0,'4x4_s1':17,'4x4_s2':0,'4x4_s3':0},Roatan:{bdo_qr:0,bdo_video:0,'4x4_s1':100,'4x4_s2':0,'4x4_s3':100},'San Lorenzo':{bdo_qr:63,bdo_video:25,'4x4_s1':100,'4x4_s2':100,'4x4_s3':50},'San Pedro Sula':{bdo_qr:30,bdo_video:0,'4x4_s1':25,'4x4_s2':0,'4x4_s3':25},Tegucigalpa:{bdo_qr:71,bdo_video:61,'4x4_s1':14,'4x4_s2':14,'4x4_s3':14}}},
  {fecha:'2026-05-19',semana:21,mesKey:'2026-05',sucursales:{Choluteca:{bdo_qr:42,bdo_video:50,'4x4_s1':100,'4x4_s2':100,'4x4_s3':0},Comayagua:{bdo_qr:92,bdo_video:38,'4x4_s1':100,'4x4_s2':100,'4x4_s3':0},Juticalpa:{bdo_qr:72,bdo_video:12,'4x4_s1':100,'4x4_s2':100,'4x4_s3':0},'La Ceiba':{bdo_qr:66,bdo_video:0,'4x4_s1':100,'4x4_s2':71,'4x4_s3':93},Proyectos:{bdo_qr:20,bdo_video:0,'4x4_s1':17,'4x4_s2':0,'4x4_s3':0},Roatan:{bdo_qr:0,bdo_video:0,'4x4_s1':100,'4x4_s2':0,'4x4_s3':100},'San Lorenzo':{bdo_qr:63,bdo_video:25,'4x4_s1':100,'4x4_s2':100,'4x4_s3':50},'San Pedro Sula':{bdo_qr:30,bdo_video:0,'4x4_s1':20,'4x4_s2':0,'4x4_s3':91},Tegucigalpa:{bdo_qr:71,bdo_video:61,'4x4_s1':14,'4x4_s2':14,'4x4_s3':14}}},
  {fecha:'2026-05-21',semana:21,mesKey:'2026-05',sucursales:{Choluteca:{bdo_qr:42,bdo_video:50,'4x4_s1':100,'4x4_s2':100,'4x4_s3':0},Comayagua:{bdo_qr:92,bdo_video:38,'4x4_s1':100,'4x4_s2':100,'4x4_s3':25},Juticalpa:{bdo_qr:94,bdo_video:12,'4x4_s1':67,'4x4_s2':67,'4x4_s3':95},'La Ceiba':{bdo_qr:66,bdo_video:0,'4x4_s1':100,'4x4_s2':71,'4x4_s3':93},Proyectos:{bdo_qr:20,bdo_video:0,'4x4_s1':17,'4x4_s2':0,'4x4_s3':0},Roatan:{bdo_qr:0,bdo_video:0,'4x4_s1':100,'4x4_s2':0,'4x4_s3':100},'San Lorenzo':{bdo_qr:63,bdo_video:25,'4x4_s1':100,'4x4_s2':100,'4x4_s3':50},'San Pedro Sula':{bdo_qr:30,bdo_video:0,'4x4_s1':20,'4x4_s2':0,'4x4_s3':91},Tegucigalpa:{bdo_qr:71,bdo_video:61,'4x4_s1':14,'4x4_s2':14,'4x4_s3':14}}},
]};

const SV_HISTORICO = {pais:'SV',cortes:[
  {fecha:'2026-04-28',semana:18,mesKey:'2026-04',sucursales:{Chalatenango:{'4x4_s1':0,'4x4_s2':0},'Juan Pablo II':{'4x4_s1':0,'4x4_s2':0},Nejapa:{'4x4_s1':90,'4x4_s2':90},'San Benito':{'4x4_s1':3,'4x4_s2':3},'San Miguel':{'4x4_s1':17,'4x4_s2':0},'Santa Ana':{'4x4_s1':23,'4x4_s2':20},Sonsonate:{'4x4_s1':70,'4x4_s2':0},'Usulután':{'4x4_s1':0,'4x4_s2':0}}},
  {fecha:'2026-04-29',semana:18,mesKey:'2026-04',sucursales:{Chalatenango:{'4x4_s1':0,'4x4_s2':0},'Juan Pablo II':{'4x4_s1':0,'4x4_s2':0},Nejapa:{'4x4_s1':90,'4x4_s2':90},'San Benito':{'4x4_s1':3,'4x4_s2':3},'San Miguel':{'4x4_s1':17,'4x4_s2':0},'Santa Ana':{'4x4_s1':23,'4x4_s2':20},Sonsonate:{'4x4_s1':70,'4x4_s2':0},'Usulután':{'4x4_s1':0,'4x4_s2':0}}},
  {fecha:'2026-04-30',semana:18,mesKey:'2026-04',sucursales:{Chalatenango:{'4x4_s1':0,'4x4_s2':0},'Juan Pablo II':{'4x4_s1':0,'4x4_s2':0},Nejapa:{'4x4_s1':90,'4x4_s2':90},'San Benito':{'4x4_s1':3,'4x4_s2':3},'San Miguel':{'4x4_s1':17,'4x4_s2':0},'Santa Ana':{'4x4_s1':23,'4x4_s2':20},Sonsonate:{'4x4_s1':70,'4x4_s2':0},'Usulután':{'4x4_s1':0,'4x4_s2':0}}},
  {fecha:'2026-05-04',semana:19,mesKey:'2026-05',sucursales:{Chalatenango:{'4x4_s1':0,'4x4_s2':0},'Juan Pablo II':{'4x4_s1':0,'4x4_s2':0},Nejapa:{'4x4_s1':100,'4x4_s2':100},'San Benito':{'4x4_s1':0,'4x4_s2':0},'San Miguel':{'4x4_s1':20,'4x4_s2':0},'Santa Ana':{'4x4_s1':20,'4x4_s2':20},Sonsonate:{'4x4_s1':75,'4x4_s2':0},'Usulután':{'4x4_s1':0,'4x4_s2':0}}},
  {fecha:'2026-05-06',semana:19,mesKey:'2026-05',sucursales:{Chalatenango:{'4x4_s1':0,'4x4_s2':0,'4x4_s3':0},'Juan Pablo II':{'4x4_s1':0,'4x4_s2':0,'4x4_s3':0},Nejapa:{'4x4_s1':90,'4x4_s2':90,'4x4_s3':0},'San Benito':{'4x4_s1':3,'4x4_s2':3,'4x4_s3':0},'San Miguel':{'4x4_s1':17,'4x4_s2':0,'4x4_s3':0},'Santa Ana':{'4x4_s1':23,'4x4_s2':20,'4x4_s3':0},Sonsonate:{'4x4_s1':70,'4x4_s2':0,'4x4_s3':0},'Usulután':{'4x4_s1':0,'4x4_s2':0,'4x4_s3':0}}},
  {fecha:'2026-05-07',semana:19,mesKey:'2026-05',sucursales:{Chalatenango:{'4x4_s1':0,'4x4_s2':0,'4x4_s3':0},'Juan Pablo II':{'4x4_s1':0,'4x4_s2':0,'4x4_s3':0},Nejapa:{'4x4_s1':90,'4x4_s2':90,'4x4_s3':0},'San Benito':{'4x4_s1':3,'4x4_s2':3,'4x4_s3':0},'San Miguel':{'4x4_s1':17,'4x4_s2':0,'4x4_s3':0},'Santa Ana':{'4x4_s1':23,'4x4_s2':20,'4x4_s3':0},Sonsonate:{'4x4_s1':70,'4x4_s2':0,'4x4_s3':0},'Usulután':{'4x4_s1':0,'4x4_s2':0,'4x4_s3':0}}},
  {fecha:'2026-05-09',semana:19,mesKey:'2026-05',sucursales:{Chalatenango:{'4x4_s1':0,'4x4_s2':0,'4x4_s3':0},'Juan Pablo II':{'4x4_s1':0,'4x4_s2':0,'4x4_s3':0},Nejapa:{'4x4_s1':90,'4x4_s2':90,'4x4_s3':0},'San Benito':{'4x4_s1':3,'4x4_s2':3,'4x4_s3':0},'San Miguel':{'4x4_s1':17,'4x4_s2':0,'4x4_s3':0},'Santa Ana':{'4x4_s1':23,'4x4_s2':20,'4x4_s3':0},Sonsonate:{'4x4_s1':70,'4x4_s2':0,'4x4_s3':0},'Usulután':{'4x4_s1':0,'4x4_s2':0,'4x4_s3':0}}},
  {fecha:'2026-05-13',semana:20,mesKey:'2026-05',sucursales:{Chalatenango:{'4x4_s1':20,'4x4_s2':20,'4x4_s3':20},'Juan Pablo II':{'4x4_s1':50,'4x4_s2':50,'4x4_s3':0},Nejapa:{'4x4_s1':100,'4x4_s2':100,'4x4_s3':25},'San Benito':{'4x4_s1':83,'4x4_s2':81,'4x4_s3':0},'San Miguel':{'4x4_s1':20,'4x4_s2':0,'4x4_s3':0},'Santa Ana':{'4x4_s1':67,'4x4_s2':17,'4x4_s3':0},Sonsonate:{'4x4_s1':75,'4x4_s2':0,'4x4_s3':0},'Usulután':{'4x4_s1':0,'4x4_s2':0,'4x4_s3':0}}},
  {fecha:'2026-05-15',semana:20,mesKey:'2026-05',sucursales:{Chalatenango:{'4x4_s1':20,'4x4_s2':20,'4x4_s3':20},'Juan Pablo II':{'4x4_s1':50,'4x4_s2':50,'4x4_s3':0},Nejapa:{'4x4_s1':100,'4x4_s2':100,'4x4_s3':25},'San Benito':{'4x4_s1':83,'4x4_s2':81,'4x4_s3':0},'San Miguel':{'4x4_s1':20,'4x4_s2':0,'4x4_s3':0},'Santa Ana':{'4x4_s1':67,'4x4_s2':17,'4x4_s3':0},Sonsonate:{'4x4_s1':75,'4x4_s2':0,'4x4_s3':0},'Usulután':{'4x4_s1':0,'4x4_s2':0,'4x4_s3':0}}},
  {fecha:'2026-05-18',semana:21,mesKey:'2026-05',sucursales:{Chalatenango:{'4x4_s1':20,'4x4_s2':20,'4x4_s3':20},'Juan Pablo II':{'4x4_s1':67,'4x4_s2':67,'4x4_s3':0},Nejapa:{'4x4_s1':100,'4x4_s2':100,'4x4_s3':100},'San Benito':{'4x4_s1':83,'4x4_s2':81,'4x4_s3':0},'San Miguel':{'4x4_s1':20,'4x4_s2':0,'4x4_s3':0},'Santa Ana':{'4x4_s1':67,'4x4_s2':17,'4x4_s3':0},Sonsonate:{'4x4_s1':75,'4x4_s2':0,'4x4_s3':0},'Usulután':{'4x4_s1':100,'4x4_s2':100,'4x4_s3':0}}},
  {fecha:'2026-05-19',semana:21,mesKey:'2026-05',sucursales:{Chalatenango:{'4x4_s1':80,'4x4_s2':80,'4x4_s3':77},'Juan Pablo II':{'4x4_s1':67,'4x4_s2':67,'4x4_s3':0},Nejapa:{'4x4_s1':100,'4x4_s2':100,'4x4_s3':100},'San Benito':{'4x4_s1':83,'4x4_s2':81,'4x4_s3':0},'San Miguel':{'4x4_s1':20,'4x4_s2':20,'4x4_s3':20},'Santa Ana':{'4x4_s1':67,'4x4_s2':67,'4x4_s3':67},Sonsonate:{'4x4_s1':75,'4x4_s2':0,'4x4_s3':0},'Usulután':{'4x4_s1':100,'4x4_s2':100,'4x4_s3':0}}},
  {fecha:'2026-05-21',semana:21,mesKey:'2026-05',sucursales:{Chalatenango:{'4x4_s1':100,'4x4_s2':100,'4x4_s3':96},'Juan Pablo II':{'4x4_s1':67,'4x4_s2':67,'4x4_s3':0},Nejapa:{'4x4_s1':100,'4x4_s2':100,'4x4_s3':100},'San Benito':{'4x4_s1':100,'4x4_s2':97,'4x4_s3':77},'San Miguel':{'4x4_s1':20,'4x4_s2':20,'4x4_s3':20},'Santa Ana':{'4x4_s1':100,'4x4_s2':100,'4x4_s3':100},Sonsonate:{'4x4_s1':100,'4x4_s2':25,'4x4_s3':96},'Usulután':{'4x4_s1':100,'4x4_s2':100,'4x4_s3':100}}},
]};

const SEED = {
  HN: {
    pais: 'HN',
    config: {
      solo4x4: false, tieneCanal: false, tieneRegion: false, tieneZona: false, tieneResumen: false,
      bdoCols: {
        qr: ['QR Griferia','QR Losa','QR SPC','QR Cerámica'],
        video: ['Video Griferia','Video de Losa','Video de SPC','Video Cerámica'],
      },
      sesCols: ['Sesión 1','Sesión 2','Sesión 3'],
      divisors: {'QR Griferia':5,'QR Losa':5,'QR SPC':4,'QR Cerámica':5,'Sesión 1':7,'Sesión 2':7,'Sesión 3':7},
    },
    bdo: HN_BDO,
    x4x: HN_X4X,
    historico: HN_HISTORICO,
  },
  SV: {
    pais: 'SV',
    config: {
      solo4x4: true, tieneCanal: false, tieneRegion: false, tieneZona: false, tieneResumen: false,
      bdoCols: { qr: [], video: [] },
      sesCols: ['Sesión 1','Sesión 2','Sesión 3'],
      divisors: {'Sesión 1':7,'Sesión 2':7,'Sesión 3':7},
    },
    bdo: [],
    x4x: SV_X4X,
    historico: SV_HISTORICO,
  },
};

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Método no permitido' }) };

  const password = event.headers['x-admin-password'] || event.headers['X-Admin-Password'];
  if (!validatePassword(password)) return { statusCode: 401, headers, body: JSON.stringify({ error: 'No autorizado' }) };

  let body;
  try { body = JSON.parse(event.body); }
  catch { return { statusCode: 400, headers, body: JSON.stringify({ error: 'JSON inválido' }) }; }

  const pais = (body?.pais || '').toUpperCase();
  if (!['HN', 'SV'].includes(pais)) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Solo HN o SV son inicializables' }) };

  const seed = JSON.parse(JSON.stringify(SEED[pais]));
  seed.updatedAt = new Date().toISOString();

  try {
    await setCountryData(pais, seed);
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, pais, rows: { bdo: seed.bdo.length, x4x: seed.x4x.length } }) };
  } catch (err) {
    const msg = err?.message || String(err);
    console.error('data-init error:', msg);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Error interno', detail: msg }) };
  }
};
