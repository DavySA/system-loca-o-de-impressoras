migrate(
  (app) => {
    // Em 'grafica_produtos': custo_unitario e preco_venda não podem ser
    // obrigatórios — no PocketBase, "required" em number significa "não-zero",
    // e produtos com custo/preço R$ 0,00 (ex.: importação de planilha) são
    // legítimos e hoje falham com "Failed to create record."
    try {
      const col = app.findCollectionByNameOrId('grafica_produtos')

      let mudou = false
      for (const nomeCampo of ['custo_unitario', 'preco_venda']) {
        const campo = col.fields.getByName(nomeCampo)
        if (campo && campo.required) {
          campo.required = false
          mudou = true
        }
      }

      if (mudou) {
        app.save(col)
      }
    } catch (e) {
      console.log('Erro ao tornar valores monetários opcionais em grafica_produtos:', e)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('grafica_produtos')
      let mudou = false
      for (const nomeCampo of ['custo_unitario', 'preco_venda']) {
        const campo = col.fields.getByName(nomeCampo)
        if (campo && !campo.required) {
          campo.required = true
          mudou = true
        }
      }
      if (mudou) {
        app.save(col)
      }
    } catch (_) {}
  },
)
