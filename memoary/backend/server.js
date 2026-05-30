import express from 'express';
import { MongoClient } from 'mongodb';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import cors from 'cors'; // Necessário para o React falar com o Express
import { Buffer } from 'buffer';

// ... suas importações aqui em cima ...

const app = express();
app.use(cors()); 
app.use(express.json());

// ==========================================
// 1. COLOQUE SUAS CHAVES DO CLOUDINARY AQUI
// ==========================================
cloudinary.config({ 
  cloud_name: 'memoary', // Ex: 'dfxxyz123'
  api_key: '417464988257681',       // Ex: '123456789012345'
  api_secret: 'nTsHto-pQ9Cj-zPMFwydwNyqiu0'  // Ex: 'A-bCDefGhIjkLMNopQrStUvWxYz'
});

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// ==========================================
// 2. COLOQUE SUA STRING DO MONGODB AQUI
// ==========================================
// Lembre-se de trocar o <password> pela sua senha real
const uri = "mongodb+srv://odilionetocarneironogueira_db_user:Odilioneto.22@cluster0.ybmuzjs.mongodb.net/?appName=Cluster0 "
const client = new MongoClient(uri);
let db;
      
async function conectarBanco() {
  try {
    await client.connect();
    // Você pode inventar um nome para o seu banco aqui. O MongoDB cria sozinho!
    db = client.db('anuarioDaTurma'); 
    console.log('✅ Conectado ao MongoDB nativo!');
  } catch (error) {
    console.error('❌ Erro ao conectar ao MongoDB:', error);
  }
}
conectarBanco();

// 4. A Rota POST
app.post('/api/anuario', upload.single('image'), async (req, res) => {
  try {
    const { legenda } = req.body;
    
    // Converte a imagem
    const b64 = Buffer.from(req.file.buffer).toString("base64");
    let dataURI = "data:" + req.file.mimetype + ";base64," + b64;

    // Upload pro Cloudinary
    const cldRes = await cloudinary.uploader.upload(dataURI, {
      folder: "anuario_disciplina"
    });

    // Objeto do MongoDB
    const novaPagina = {
      tipoLayout: 'grid',
      elementos: [
        {
          tipo: 'imagem',
          url: cldRes.secure_url,
          legenda: legenda || ''
        }
      ],
      criadoEm: new Date()
    };

    // Salva no banco
    const colecao = db.collection('paginas');
    const resultado = await colecao.insertOne(novaPagina);

    res.status(201).json({ 
      success: true, 
      data: { ...novaPagina, _id: resultado.insertedId } 
    });

  } catch (error) {
    console.error('Erro na rota de upload:', error);
    res.status(500).json({ success: false, message: 'Erro ao processar o envio.' });
  }
});

// Iniciar o servidor
app.listen(3001, () => {
  console.log('🚀 Servidor rodando na porta 3001');
});