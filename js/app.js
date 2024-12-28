App = {
  web3Provider: null,
  contracts: {},
  web3: null,

  init: async function () {
    await App.initWeb3();
    await App.displayAccountInfo();
    App.bindEvents(); // Bind event listeners after web3 is initialized
  },

  initWeb3: async function () {
    if (window.ethereum) {
      App.web3Provider = window.ethereum;
      try {
        await window.ethereum.request({ method: "eth_requestAccounts" });
      } catch (error) {
        console.error("User denied account access.", error);
        alert("Please allow access to MetaMask.");
        return;
      }
    } else if (window.web3) {
      App.web3Provider = window.web3.currentProvider;
    } else {
      alert("No Web3 provider detected. Please install MetaMask.");
      return;
    }
    App.web3 = new Web3(App.web3Provider);
    return App.initContract();
  },

  initContract: function () {
    return $.getJSON("SupplyChain.json")
      .then((data) => {
        const SupplyChainArtifact = data;
        App.contracts.SupplyChain = TruffleContract(SupplyChainArtifact);
        App.contracts.SupplyChain.setProvider(App.web3Provider);
        return App.contracts.SupplyChain.deployed();
      })
      .catch((error) => {
        console.error("Failed to load contract:", error);
        alert("Failed to load contract.");
      });
  },

  bindEvents: function () {
    document.getElementById("createProductBtn").addEventListener("click", App.createProduct);
    document.getElementById("updateProductBtn").addEventListener("click", App.updateProductState);
    document.getElementById("fetchProductsBtn").addEventListener("click", App.fetchAllProducts);
    document.getElementById("transferOwnershipBtn").addEventListener("click", App.transferOwnership); // Bind transfer ownership button
  },

  getAccounts: async function () {
    try {
      return await App.web3.eth.getAccounts();
    } catch (err) {
      console.error("Error fetching accounts:", err);
      alert("Error fetching accounts.");
      return [];
    }
  },

  createProduct: async function () {
    const productName = document.getElementById("productName").value.trim();
    if (!productName) {
      alert("Product name cannot be empty.");
      return;
    }

    const instance = await App.contracts.SupplyChain.deployed();
    const accounts = await App.getAccounts();
    if (accounts.length === 0) {
      alert("No accounts available.");
      return;
    }

    try {
      document.getElementById("loading").style.display = "block"; // Show loading
      const result = await instance.createProduct(productName, { from: accounts[0] });
      console.log("Product created", result);
      alert("Product created successfully!");
      document.getElementById("productName").value = ""; // Clear input
    } catch (err) {
      console.error("Error creating product:", err);
      alert("Failed to create product. " + err.message);
    } finally {
      document.getElementById("loading").style.display = "none"; // Hide loading
    }
  },

  updateProductState: async function () {
    const productId = document.getElementById("productId").value;
    const state = document.getElementById("productState").value;

    if (!productId) {
      alert("Product ID cannot be empty.");
      return;
    }

    const instance = await App.contracts.SupplyChain.deployed();
    const accounts = await App.getAccounts();
    if (accounts.length === 0) {
      alert("No accounts available.");
      return;
    }

    try {
      document.getElementById("loading").style.display = "block"; // Show loading
      const product = await instance.getProduct(productId); // Fetch product details
      const ownerAddress = product.owner;

      // Check if the current account is the owner
      if (accounts[0].toLowerCase() !== ownerAddress.toLowerCase()) {
        alert("You are not the owner of this product and cannot update its state.");
        return;
      }

      // Proceed with updating the product state
      const result = await instance.updateProductState(productId, state, { from: accounts[0] });
      console.log("Product state updated", result);
      alert("Product state updated successfully!");
      document.getElementById("productId").value = ""; // Clear input
    } catch (err) {
      console.error("Error updating product state:", err);
      alert("Failed to update product state. " + err.message);
    } finally {
      document.getElementById("loading").style.display = "none"; // Hide loading
    }
},

  fetchProduct: async function (productId) {
    const instance = await App.contracts.SupplyChain.deployed();
    try {
      const product = await instance.getProduct(productId); // Fetch product from the smart contract
      console.log("Product fetched", product);
      return {
        id: product.id.toString(), // Ensure ID is a string for display
        name: product.name,
        state: product.state.toString() // Convert state enum to string for display
      };
    } catch (err) {
      console.error("Error fetching product:", err);
      alert("Failed to fetch product.");
    }
  },

  fetchAllProducts: async function () {
    const totalProducts = await App.getTotalProducts(); // Get total products count from contract
    const productList = document.getElementById("productList");
    productList.innerHTML = ""; // Clear the previous product list

    if (totalProducts === 0) {
      alert("No products available.");
      return;
    }

    for (let i = 1; i <= totalProducts; i++) {
      const product = await App.fetchProduct(i); // Fetch each product by ID
      App.displayProduct(product); // Display product in the UI
    }
  },

  displayProduct: function (product) {
    const productList = document.getElementById("productList");
    const productElement = document.createElement("div");
    productElement.innerHTML = `<strong>Product ID:</strong> ${product.id} <br>
                                <strong>Name:</strong> ${product.name} <br>
                                <strong>State:</strong> ${App.getStateString(product.state)} <br><br>`;
    productList.appendChild(productElement);
  },

  getStateString: function (state) {
    const states = ["Created", "InTransit", "Delivered"];
    return states[state] || "Unknown"; // Convert state enum to string
  },

  getTotalProducts: async function () {
    const instance = await App.contracts.SupplyChain.deployed();
    try {
      const productCounter = await instance.productCounter(); // Fetch total product count from the contract
      return productCounter.toNumber(); // Return the number of products
    } catch (err) {
      console.error("Error fetching total products:", err);
      alert("Failed to fetch total products.");
      return 0;
    }
  },

  displayAccountInfo: async function () {
    const accounts = await App.getAccounts();
    if (accounts.length > 0) {
      App.account = accounts[0]; // Get the first account
      document.getElementById("accountInfo").innerText = `Connected Account: ${App.account}`;
      
      // Display network information
      const networkId = await App.web3.eth.net.getId();
      const networkName = await App.getNetworkName(networkId);

      document.getElementById("networkInfo").innerText = `Network: ${networkName}`;
    } else {
      document.getElementById("accountInfo").innerText = "No account connected";
    }
  },

  getNetworkName: async function (networkId) {
    // Ensure the input is treated as a number
    const id = Number(networkId); // Convert networkId to a number
    switch (id) {
      case 1: return "Main Ethereum Network";
      case 3: return "Ropsten Test Network";
      case 4: return "Rinkeby Test Network";
      case 5: return "Goerli Test Network";
      case 11155111: return "Sepolia Test Network"; // Sepolia
      case 421613: return "Linea Sepolia Test Network"; // Linea Sepolia
      case 420: return "Linea Goerli Test Network"; // Linea Goerli
      default: return "Unknown Network";
    }
  },

  transferOwnership: async function () {
    const productId = document.getElementById("transferProductId").value;
    const newOwner = document.getElementById("newOwnerAddress").value;

    if (!productId || !newOwner) {
      alert("Product ID and new owner address cannot be empty.");
      return;
    }

    const instance = await App.contracts.SupplyChain.deployed();
    const accounts = await App.getAccounts();
    if (accounts.length === 0) {
      alert("No accounts available.");
      return;
    }

    try {
      document.getElementById("loading").style.display = "block"; // Show loading
      const result = await instance.transferOwnership(productId, newOwner, { from: accounts[0] });
      console.log("Ownership transferred", result);
      alert("Ownership transferred successfully!");
      document.getElementById("transferProductId").value = ""; // Clear input
      document.getElementById("newOwnerAddress").value = ""; // Clear input
    } catch (err) {
      console.error("Error transferring ownership:", err);
      alert("Failed to transfer ownership. " + err.message);
    } finally {
      document.getElementById("loading").style.display = "none"; // Hide loading
    }
  },
};

// Initialize the app when the page loads
$(window).on("load", function () {
  App.init();
});