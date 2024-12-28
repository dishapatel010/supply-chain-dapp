// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SupplyChain {
    enum State { Created, InTransit, Delivered }

    struct Product {
        uint id;
        string name;
        State state;
        address owner;
    }

    mapping(uint => Product) public products;
    uint public productCounter;

    event ProductCreated(uint id, string name, address owner);
    event ProductStateUpdated(uint id, State state);
    event OwnershipTransferred(uint productId, address previousOwner, address newOwner);

    function createProduct(string memory _name) public {
        productCounter++;
        products[productCounter] = Product(productCounter, _name, State.Created, msg.sender);
        emit ProductCreated(productCounter, _name, msg.sender);
    }

    function updateProductState(uint _productId, State _state) public {
        require(products[_productId].owner == msg.sender, "Only the owner can update the product.");
        products[_productId].state = _state;
        emit ProductStateUpdated(_productId, _state);
    }

    function transferOwnership(uint _productId, address _newOwner) public {
        require(products[_productId].owner == msg.sender, "Only the owner can transfer ownership.");
        require(_newOwner != address(0), "Invalid address for new owner.");

        address previousOwner = products[_productId].owner;
        products[_productId].owner = _newOwner;

        emit OwnershipTransferred(_productId, previousOwner, _newOwner);
    }

    function getProduct(uint _productId) public view returns (Product memory) {
        return products[_productId];
    }
}