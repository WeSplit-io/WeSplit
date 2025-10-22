/**
 * Exemple d'utilisation du composant Modal amélioré
 * Montre comment utiliser le titre, la description et la structure modalContent
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Modal } from '../components/shared';

const ExampleModalUsage: React.FC = () => {
  const [showModal, setShowModal] = useState(false);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.button}
        onPress={() => setShowModal(true)}
      >
        <Text style={styles.buttonText}>Ouvrir Modal</Text>
      </TouchableOpacity>

      {/* Exemple 1: Modal avec titre et description */}
      <Modal
        visible={showModal}
        onClose={() => setShowModal(false)}
        title="Confirmer l'action"
        description="Cette action va modifier vos paramètres. Êtes-vous sûr de vouloir continuer ?"
        showHandle={true}
        closeOnBackdrop={true}
      >
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>Confirmer</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.cancelButton}
          onPress={() => setShowModal(false)}
        >
          <Text style={styles.cancelButtonText}>Annuler</Text>
        </TouchableOpacity>
      </Modal>

      {/* Exemple 2: Modal simple sans titre/description */}
      <Modal
        visible={false} // Exemple
        onClose={() => {}}
        showHandle={true}
        closeOnBackdrop={true}
      >
        <Text>Contenu simple sans titre</Text>
      </Modal>

      {/* Exemple 3: Modal avec titre seulement */}
      <Modal
        visible={false} // Exemple
        onClose={() => {}}
        title="Sélectionner une option"
        showHandle={true}
        closeOnBackdrop={true}
      >
        <TouchableOpacity style={styles.optionButton}>
          <Text>Option 1</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.optionButton}>
          <Text>Option 2</Text>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  actionButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  optionButton: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
});

export default ExampleModalUsage;
