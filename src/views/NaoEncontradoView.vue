<template>
  <div class="page">
    <section class="card vazio">
      <h1>Página não encontrada</h1>
      <p class="muted">O endereço digitado não existe.</p>
      <p><RouterLink :to="{ name: 'bancada' }" class="btn btn-primary">Voltar para a Bancada</RouterLink></p>
    </section>
  </div>
</template>

<style scoped>
.vazio {
  display: grid;
  gap: 12px;
  justify-items: center;
}
</style>
