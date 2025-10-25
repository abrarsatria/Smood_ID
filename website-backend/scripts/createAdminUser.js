#!/usr/bin/env node
'use strict'

require('dotenv').config()
const bcrypt = require('bcrypt')
const { User, sequelize } = require('../src/models')

;(async () => {
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@smood.id'
  const ADMIN_NAME = process.env.ADMIN_NAME || 'admin'
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'

  if (!ADMIN_EMAIL) {
    console.error('ADMIN_EMAIL tidak ditentukan. Set env ADMIN_EMAIL atau gunakan default.')
    process.exit(1)
  }

  try {
    const existing = await User.findOne({ where: { email: ADMIN_EMAIL } })
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10)

    if (!existing) {
      const user = await User.create({ name: ADMIN_NAME, email: ADMIN_EMAIL, passwordHash })
      console.log('Admin user berhasil dibuat:', { id: user.id, email: user.email, name: user.name })
    } else {
      await existing.update({ name: ADMIN_NAME, passwordHash })
      console.log('Admin user sudah ada. Password dan nama diperbarui:', { id: existing.id, email: existing.email })
    }

    console.log('\nPENTING: Tambahkan email ini ke ADMIN_EMAILS di .env agar akses admin dibatasi:')
    console.log('ADMIN_EMAILS=' + ADMIN_EMAIL)
  } catch (e) {
    console.error('Gagal membuat admin user:', e.message)
    process.exit(1)
  } finally {
    await sequelize.close()
  }
})()
