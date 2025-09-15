// React Native compatible browserify-sign complete stub
const algos = require('./algos.js');

const mainModule = {
  createSign: function() { 
    return { 
      update: function() { return this; }, 
      sign: function() { return Buffer.alloc(64); } 
    }; 
  },
  Sign: function() { 
    return { 
      update: function() { return this; }, 
      sign: function() { return Buffer.alloc(64); } 
    }; 
  },
  createVerify: function() { 
    return { 
      update: function() { return this; }, 
      verify: function() { return true; } 
    }; 
  },
  Verify: function() { 
    return { 
      update: function() { return this; }, 
      verify: function() { return true; } 
    }; 
  },
  algos: algos
};

module.exports = mainModule;
module.exports.algos = algos; // Explicitly export algos as a submodule

