// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract LandRegistry {
    // Define the Land structure
    struct Land {
        uint256 landId;
        address currentOwner;
        uint256 size; // in square feet
        string location; // coordinates
        string landTitleNumber;
        bool isVerified;
    }

    // Define the Ownership Record structure
    struct OwnershipRecord {
        address owner;
        uint256 timestamp;
        bool verified;
    }

    // State variables
    address public admin;
    mapping(uint256 => Land) public lands;
    mapping(uint256 => OwnershipRecord[]) public ownershipHistory;
    mapping(address => uint256[]) public ownerLands;

    // Events
    event LandRegistered(uint256 indexed landId, address indexed owner, uint256 timestamp);
    event LandVerified(uint256 indexed landId, address indexed owner, uint256 timestamp);
    event OwnershipTransferred(uint256 indexed landId, address indexed oldOwner, address indexed newOwner, uint256 timestamp);

    // Modifiers
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this action");
        _;
    }

    modifier onlyOwner(uint256 _landId) {
        require(lands[_landId].currentOwner == msg.sender, "Only the land owner can perform this action");
        _;
    }

    // Constructor
    constructor() {
        admin = msg.sender;
    }

    // Function to register a new land (Admin only)
    function registerLand(
        uint256 _landId,
        address _owner,
        uint256 _size,
        string memory _location,
        string memory _landTitleNumber
    ) public onlyAdmin {
        // Ensure the land ID is unique
        require(lands[_landId].landId == 0, "Land already registered");

        // Create the land object
        Land memory newLand = Land({
            landId: _landId,
            currentOwner: _owner,
            size: _size,
            location: _location,
            landTitleNumber: _landTitleNumber,
            isVerified: false
        });

        // Store the land
        lands[_landId] = newLand;

        // Add to owner's lands
        ownerLands[_owner].push(_landId);

        // Initialize ownership history
        OwnershipRecord memory initialRecord = OwnershipRecord({
            owner: _owner,
            timestamp: block.timestamp,
            verified: false
        });

        ownershipHistory[_landId].push(initialRecord);

        // Emit event
        emit LandRegistered(_landId, _owner, block.timestamp);
    }

    // Function to verify land ownership (Admin only)
    function verifyLand(uint256 _landId) public onlyAdmin {
        // Ensure the land exists
        require(lands[_landId].landId != 0, "Land not registered");
        
        // Update verification status
        lands[_landId].isVerified = true;
        
        // Update last record in ownership history
        uint256 lastIndex = ownershipHistory[_landId].length - 1;
        ownershipHistory[_landId][lastIndex].verified = true;
        
        // Emit event
        emit LandVerified(_landId, lands[_landId].currentOwner, block.timestamp);
    }

    // Function to transfer land ownership (Current owner only)
    function transferOwnership(uint256 _landId, address _newOwner) public onlyOwner(_landId) {
        // Ensure the land exists and is verified
        require(lands[_landId].landId != 0, "Land not registered");
        require(lands[_landId].isVerified, "Land not verified, cannot transfer");
        require(_newOwner != address(0), "Invalid new owner address");
        require(_newOwner != msg.sender, "Cannot transfer to yourself");

        // Store the old owner
        address oldOwner = lands[_landId].currentOwner;
        
        // Update land owner
        lands[_landId].currentOwner = _newOwner;
        lands[_landId].isVerified = false; // Reset verification for new owner
        
        // Remove from old owner's lands
        removeFromOwnerLands(oldOwner, _landId);
        
        // Add to new owner's lands
        ownerLands[_newOwner].push(_landId);
        
        // Add to ownership history
        OwnershipRecord memory newRecord = OwnershipRecord({
            owner: _newOwner,
            timestamp: block.timestamp,
            verified: false
        });
        
        ownershipHistory[_landId].push(newRecord);
        
        // Emit event
        emit OwnershipTransferred(_landId, oldOwner, _newOwner, block.timestamp);
    }

    // Function to remove land from owner's lands array
    function removeFromOwnerLands(address _owner, uint256 _landId) private {
        uint256[] storage lands = ownerLands[_owner];
        for (uint256 i = 0; i < lands.length; i++) {
            if (lands[i] == _landId) {
                // Move the last element to the position of the element to delete
                lands[i] = lands[lands.length - 1];
                // Remove the last element
                lands.pop();
                break;
            }
        }
    }

    // Function to get land details
    function getLandDetails(uint256 _landId) public view returns (
        uint256 landId,
        address currentOwner,
        uint256 size,
        string memory location,
        string memory landTitleNumber,
        bool isVerified
    ) {
        require(lands[_landId].landId != 0, "Land not registered");
        
        Land storage land = lands[_landId];
        return (
            land.landId,
            land.currentOwner,
            land.size,
            land.location,
            land.landTitleNumber,
            land.isVerified
        );
    }

    // Function to get ownership history of a land
    function getOwnershipHistory(uint256 _landId) public view returns (OwnershipRecord[] memory) {
        require(lands[_landId].landId != 0, "Land not registered");
        return ownershipHistory[_landId];
    }

    // Function to get all lands owned by an address
    function getOwnerLands(address _owner) public view returns (uint256[] memory) {
        return ownerLands[_owner];
    }

    // Function to change admin (Only current admin)
    function changeAdmin(address _newAdmin) public onlyAdmin {
        require(_newAdmin != address(0), "Invalid new admin address");
        admin = _newAdmin;
    }
}