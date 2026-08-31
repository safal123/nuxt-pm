import { defineStore } from 'pinia'

export const useModalsStore = defineStore('modals', () => {
  const modalName = ref('')
  const isOpen = ref(false)
  const modalProps = ref<Record<string, any>>({})

  function openModal(name: string, props?: Record<string, any>) {
    modalName.value = name
    modalProps.value = props || {}
    isOpen.value = true
  }

  function closeModal() {
    isOpen.value = false
    modalName.value = ''
    modalProps.value = {}
  }

  return {
    modalName,
    isOpen,
    modalProps,
    openModal,
    closeModal,
  }
})