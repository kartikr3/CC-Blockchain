// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title LandRegistry
 * @dev A blockchain-based land ownership and transfer system
 */
contract LandRegistry {
    address public admin;
    
    struct Land {
        uint256 landId;
        address currentOwner;
        uint256 size; // in sq. ft.
        string location; // coordinates
        string landTitleNumber;
        bool isVerified;
        uint256 registrationDate;
    }
    
    struct OwnershipHistory {
        address owner;
        uint256 transferTimestamp;
        bool wasVerified;
    }
    
    // Mapping from landId to Land
    mapping(uint256 => Land) public lands;
    
    // Mapping from landId to ownership history
    mapping(uint256 => OwnershipHistory[]) public ownershipHistories;
    
    // Array to keep track of all registered landIds
    uint256[] public allLandIds;
    
    // Events
    event LandRegistered(uint256 indexed landId, address indexed owner, uint256 timestamp);
    event LandVerified(uint256 indexed landId, uint256 timestamp);
    event OwnershipTransferred(uint256 indexed landId, address indexed previousOwner, address indexed newOwner, uint256 timestamp);
    
    // Modifiers
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this function");
        _;
    }
    
    modifier onlyOwner(uint256 _landId) {
        require(lands[_landId].currentOwner == msg.sender, "Only land owner can call this function");
        _;
    }
    
    modifier landExists(uint256 _landId) {
        require(lands[_landId].landId == _landId, "Land does not exist");
        _;
    }
    
    constructor() {
        admin = msg.sender;
    }
    
    /**
     * @dev Register new land (Admin only)
     * @param _landId Unique identifier for the land
     * @param _owner Address of the initial owner
     * @param _size Land size in sq. ft.
     * @param _location Land coordinates
     * @param _landTitleNumber Official land title number
     */
    function registerLand(
        uint256 _landId, 
        address _owner, 
        uint256 _size, 
        string memory _location, 
        string memory _landTitleNumber
    ) 
        public 
        onlyAdmin 
    {
        // Check if land already exists
        require(lands[_landId].landId != _landId, "Land with this ID already exists");
        
        // Create new land record
        lands[_landId] = Land({
            landId: _landId,
            currentOwner: _owner,
            size: _size,
            location: _location,
            landTitleNumber: _landTitleNumber,
            isVerified: false,
            registrationDate: block.timestamp
        });
        
        // Add to landIds array
        allLandIds.push(_landId);
        
        // Add initial entry to ownership history
        ownershipHistories[_landId].push(OwnershipHistory({
            owner: _owner,
            transferTimestamp: block.timestamp,
            wasVerified: false
        }));
        
        // Emit event
        emit LandRegistered(_landId, _owner, block.timestamp);
    }
    
    /**
     * @dev Verify land ownership (Admin only)
     * @param _landId ID of the land to verify
     */
    function verifyLand(uint256 _landId) 
        public 
        onlyAdmin 
        landExists(_landId) 
    {
        require(!lands[_landId].isVerified, "Land is already verified");
        lands[_landId].isVerified = true;
        
        // Update the verification status in history
        OwnershipHistory[] storage history = ownershipHistories[_landId];
        if (history.length > 0) {
            history[history.length - 1].wasVerified = true;
        }
        
        emit LandVerified(_landId, block.timestamp);
    }
    
    /**
     * @dev Transfer land ownership (Owner only)
     * @param _landId ID of the land to transfer
     * @param _newOwner Address of the new owner
     */
    function transferOwnership(uint256 _landId, address _newOwner) 
        public 
        landExists(_landId) 
        onlyOwner(_landId) 
    {
        require(lands[_landId].isVerified, "Land is not verified for transfer");
        require(_newOwner != address(0), "New owner cannot be the zero address");
        require(_newOwner != lands[_landId].currentOwner, "New owner cannot be the current owner");
        
        address previousOwner = lands[_landId].currentOwner;
        lands[_landId].currentOwner = _newOwner;
        
        // Add to ownership history
        ownershipHistories[_landId].push(OwnershipHistory({
            owner: _newOwner,
            transferTimestamp: block.timestamp,
            wasVerified: true
        }));
        
        emit OwnershipTransferred(_landId, previousOwner, _newOwner, block.timestamp);
    }
    
    /**
     * @dev Get land details
     * @param _landId ID of the land
     * @return Land struct
     */
    function getLandDetails(uint256 _landId) 
        public 
        view 
        landExists(_landId) 
        returns (Land memory) 
    {
        return lands[_landId];
    }
    
    /**
     * @dev Get ownership history for a land
     * @param _landId ID of the land
     * @return Array of OwnershipHistory structs
     */
    function getOwnershipHistory(uint256 _landId) 
        public 
        view 
        landExists(_landId) 
        returns (OwnershipHistory[] memory) 
    {
        return ownershipHistories[_landId];
    }
    
    /**
     * @dev Get all registered land IDs
     * @return Array of landIds
     */
    function getAllLandIds() public view returns (uint256[] memory) {
        return allLandIds;
    }
    
    /**
     * @dev Get count of all registered lands
     * @return Count of lands
     */
    function getLandCount() public view returns (uint256) {
        return allLandIds.length;
    }
    
    /**
     * @dev Check if address is the owner of specified land
     * @param _landId ID of the land
     * @param _address Address to check
     * @return True if address is owner
     */
    function isOwner(uint256 _landId, address _address) 
        public 
        view 
        landExists(_landId) 
        returns (bool) 
    {
        return lands[_landId].currentOwner == _address;
    }
    
    /**
     * @dev Transfer admin rights (Admin only)
     * @param _newAdmin Address of the new admin
     */
    function transferAdmin(address _newAdmin) 
        public 
        onlyAdmin 
    {
        require(_newAdmin != address(0), "New admin cannot be the zero address");
        admin = _newAdmin;
    }
}
