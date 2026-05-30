import express from 'express';
import { MongoClient } from 'mongodb';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import cors from 'cors'; 
import { Buffer } from 'buffer';
import process from 'process';

// INICIALIZA O DOTENV (Lê o arquivo .env se você estiver rodando no seu computador)
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(cors()); 
app.use(express.json());

// ==========================================
// 1. CONFIGURAÇÃO DO CLOUDINARY USANDO .ENV
// ==========================================
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// ==========================================
// 2. STRING DO MONGODB USANDO .ENV
// ==========================================
const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);
let db;
      
async function conectarBanco() {
  try {
    await client.connect();
    db = client.db('anuarioDaTurma'); 
    console.log('✅ Conectado ao MongoDB nativo!');
  } catch (error) {
    console.error('❌ Erro ao conectar ao MongoDB:', error);
  }
}
conectarBanco();

// Rota POST para Upload e Criação de Página
app.post('/api/anuario', upload.single('image'), async (req, res) => {
  try {
    const { legenda } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Nenhuma imagem foi enviada.' });
    }

    // Converte a imagem para Buffer base64
    const b64 = Buffer.from(req.file.buffer).toString("base64");
    let dataURI = "data:" + req.file.mimetype + ";base64," + b64;

    // Upload para o Cloudinary
    const cldRes = await cloudinary.uploader.upload(dataURI, {
      folder: "anuario_disciplina"
    });

    // Estrutura o objeto que vai para o MongoDB
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

    // Salva no banco de dados
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

// Configuração da porta dinâmica do Render ou local
const PORT = process.env.PORT || 3001;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});