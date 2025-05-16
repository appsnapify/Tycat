import { NextResponse } from 'next/server'
import { createAdminClient } from '../../../../lib/supabase/adminClient'
import { SupabaseClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  const supabaseAdmin = createAdminClient();
  try {
    // Processar o FormData
    const formData = await request.formData()
    const name = formData.get('name') as string
    const email = formData.get('email') as string
    const address = formData.get('address') as string
    const logo = formData.get('logo') as File
    const banner = formData.get('banner') as File
    const userId = formData.get('userId') as string
    const instagram = formData.get('instagram') as string
    const facebook = formData.get('facebook') as string
    const youtube = formData.get('youtube') as string
    const tiktok = formData.get('tiktok') as string

    console.log('API: Dados recebidos para criar organização', {
      name, email, address,
      logoName: logo?.name, 
      bannerName: banner?.name,
      userId,
      instagram,
      facebook,
      youtube,
      tiktok
    })

    if (!name || !email || !userId || !logo || !banner) {
      return NextResponse.json(
        { error: 'Dados incompletos' },
        { status: 400 }
      )
    }

    // Upload do logo
    console.log('API: Iniciando upload do logo')
    const logoArrayBuffer = await logo.arrayBuffer()
    const logoData = new Uint8Array(logoArrayBuffer)
    const logoFileExt = logo.name.split('.').pop()?.toLowerCase()
    const logoFileName = `logo-${Date.now()}.${logoFileExt}`

    const { data: logoUploadData, error: logoUploadError } = await supabaseAdmin.storage
      .from('organization_logos')
      .upload(logoFileName, logoData, {
        contentType: logo.type,
        upsert: true
      })

    if (logoUploadError) {
      console.error('API: Erro no upload do logo:', logoUploadError)
      return NextResponse.json(
        { error: `Erro no upload do logo: ${logoUploadError.message}` },
        { status: 500 }
      )
    }

    console.log('API: Logo enviado com sucesso')
    const { data: { publicUrl: logoUrl } } = supabaseAdmin.storage
      .from('organization_logos')
      .getPublicUrl(logoFileName)

    // Upload do banner
    console.log('API: Iniciando upload do banner')
    const bannerArrayBuffer = await banner.arrayBuffer()
    const bannerData = new Uint8Array(bannerArrayBuffer)
    const bannerFileExt = banner.name.split('.').pop()?.toLowerCase()
    const bannerFileName = `banner-${Date.now()}.${bannerFileExt}`

    const { data: bannerUploadData, error: bannerUploadError } = await supabaseAdmin.storage
      .from('organization_logos')
      .upload(bannerFileName, bannerData, {
        contentType: banner.type,
        upsert: true
      })

    if (bannerUploadError) {
      console.error('API: Erro no upload do banner:', bannerUploadError)
      return NextResponse.json(
        { error: `Erro no upload do banner: ${bannerUploadError.message}` },
        { status: 500 }
      )
    }

    console.log('API: Banner enviado com sucesso')
    const { data: { publicUrl: bannerUrl } } = supabaseAdmin.storage
      .from('organization_logos')
      .getPublicUrl(bannerFileName)

    // Verificar se o usuário existe na tabela de perfis
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    // Se não existir perfil, tentar criar um com base nos dados do auth.users
    if (!profileData || profileError) {
      console.log('API: Perfil não encontrado, buscando na auth.users')
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId)

      if (userError || !userData?.user) {
        console.error('API: Usuário não encontrado na tabela auth.users', userError)
        return NextResponse.json(
          { error: 'Usuário não encontrado' },
          { status: 404 }
        )
      }

      // Criar perfil com base nos dados do usuário
      console.log('API: Criando perfil para o usuário')
      const { error: insertProfileError } = await supabaseAdmin
        .from('profiles')
        .insert([{
          id: userId,
          first_name: userData.user.user_metadata.first_name || 'Usuário',
          last_name: userData.user.user_metadata.last_name || '',
          role: userData.user.user_metadata.role || 'organizador',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])

      if (insertProfileError) {
        console.error('API: Erro ao criar perfil', insertProfileError)
      } else {
        console.log('API: Perfil criado com sucesso')
      }
    }

    // Adicionar redes sociais (opcional)
    const twitter = formData.get('twitter') as string
    const website = formData.get('website') as string
    
    // Criar objeto de redes sociais
    const social_media = {
      instagram: instagram || '',
      facebook: facebook || '',
      youtube: youtube || '',
      tiktok: tiktok || '',
      twitter: twitter || '',
      website: website || ''
    }

    // Criar a organização diretamente na tabela
    console.log('API: Criando organização diretamente')
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert([{
        name,
        email,
        address,
        logo_url: logoUrl,
        banner_url: bannerUrl,
        social_media, // Usando o objeto criado
        slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (orgError) {
      console.error('API: Erro ao criar organização:', orgError)
      return NextResponse.json(
        { error: `Erro ao criar organização: ${orgError.message}` },
        { status: 500 }
      )
    }

    console.log('API: Organização criada com sucesso:', org)

    // Criar relação entre usuário e organização
    console.log('API: Criando relação usuário-organização diretamente')
    const { error: relError } = await supabaseAdmin
      .from('user_organizations')
      .insert([{
        user_id: userId,
        organization_id: org.id,
        role: 'owner',
        created_at: new Date().toISOString()
      }])

    if (relError) {
      // Se falhar, tente uma abordagem diferente - ignorar a chave estrangeira
      console.error('API: Erro ao criar relação diretamente:', relError)
      
      try {
        // Executar SQL diretamente para ignorar restrições
        const { error: sqlError } = await supabaseAdmin.rpc('insert_user_organization', {
          p_user_id: userId,
          p_organization_id: org.id,
          p_role: 'owner'
        })
        
        if (sqlError) {
          console.error('API: Erro ao criar relação via SQL:', sqlError)
          // Não falhar o processo, já temos a organização criada
        } else {
          console.log('API: Relação criada via SQL com sucesso')
        }
      } catch (sqlExecError) {
        console.error('API: Exceção ao criar relação via SQL:', sqlExecError)
      }
    } else {
      console.log('API: Relação criada com sucesso')
    }

    return NextResponse.json({
      id: org.id,
      slug: org.slug,
      name: org.name
    })
  } catch (error) {
    console.error('API: Erro no servidor:', error)
    return NextResponse.json(
      { error: 'Erro no servidor' },
      { status: 500 }
    )
  }
} 