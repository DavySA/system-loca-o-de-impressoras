migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('grafica_produtos')
    const f = col.fields.getByName('categoria')
    console.log('PROBE typeof f.type =', typeof f.type)
    try {
      console.log('PROBE f.type() =', f.type())
    } catch (e) {
      console.log('PROBE f.type() erro:', e)
    }
    try {
      console.log('PROBE f.Type() =', f.Type())
    } catch (e) {
      console.log('PROBE f.Type() erro:', e)
    }
    console.log('PROBE typeof f.setType =', typeof f.setType)
    console.log('PROBE typeof f.SetType =', typeof f.SetType)
    const keys = []
    for (const k in f) keys.push(k)
    console.log('PROBE chaves enumeráveis:', keys.join(','))
    try {
      console.log('PROBE f.string() =', typeof f.string)
    } catch (e) {
      console.log('PROBE string err:', e)
    }
  },
  (app) => {},
)
