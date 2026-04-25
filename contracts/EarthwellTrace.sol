// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract EarthwellTrace {
    address public owner;

    struct Batch {
        string batchId;
        string productName;
        string origin;
        string farmerName;
        string harvestDate;
        string processingDate;
        string certifications;
        string ipfsHash;
        uint256 timestamp;
        bool exists;
    }

    mapping(string => Batch) private batches;
    string[] public batchIds;

    event BatchLogged(string indexed batchId, string productName, uint256 timestamp);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorized");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function logBatch(
        string calldata batchId,
        string calldata productName,
        string calldata origin,
        string calldata farmerName,
        string calldata harvestDate,
        string calldata processingDate,
        string calldata certifications,
        string calldata ipfsHash
    ) external onlyOwner {
        require(!batches[batchId].exists, "Batch already exists");

        batches[batchId] = Batch({
            batchId: batchId,
            productName: productName,
            origin: origin,
            farmerName: farmerName,
            harvestDate: harvestDate,
            processingDate: processingDate,
            certifications: certifications,
            ipfsHash: ipfsHash,
            timestamp: block.timestamp,
            exists: true
        });

        batchIds.push(batchId);
        emit BatchLogged(batchId, productName, block.timestamp);
    }

    function getBatch(string calldata batchId) external view returns (Batch memory) {
        require(batches[batchId].exists, "Batch not found");
        return batches[batchId];
    }

    function getBatchCount() external view returns (uint256) {
        return batchIds.length;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid address");
        owner = newOwner;
    }
}
