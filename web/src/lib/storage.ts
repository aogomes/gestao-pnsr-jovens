import { supabase } from './supabase';

/**
 * Faz o upload de um arquivo para o Supabase Storage e retorna a URL pública.
 * @param file O arquivo a ser feito upload.
 * @param bucket O nome do bucket (ex: 'passaportes', 'comprovantes').
 * @param path Um caminho opcional dentro do bucket (ex: 'rifa_123').
 * @returns A URL pública do arquivo ou joga um erro.
 */
export async function uploadFile(file: File, bucket: string, path: string = ''): Promise<string> {
  if (!file) throw new Error('Nenhum arquivo fornecido.');

  // Gera um nome de arquivo único para evitar colisões
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
  const filePath = path ? `${path}/${fileName}` : fileName;

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error('Erro no upload para o Supabase:', error);
    throw new Error(`Erro ao fazer upload do arquivo: ${error.message}`);
  }

  // Retorna apenas o caminho interno, pois agora o bucket é privado
  return filePath;
}
