// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Certification
 * @dev Manages the issuance and verification of digital certificates.
 * The contract owner can designate addresses as Institutions or Verifiers.
 * Institutions can issue new certificates (documents).
 * Verifiers can verify the authenticity of issued certificates.
 * Users can request verification of their certificates.
 */
contract Certification {
    address public owner;
    uint256 public documentCount;

    enum UserRole { NONE, USER, VERIFIER, INSTITUTION }
    
    struct Document {
        address issuer;
        address recipient;
        string documentHash;
        string metadataURI; // IPFS or other decentralized storage URI for document metadata
        uint256 timestamp;
        uint256 expirationDate;
        bool isValid;
        bool isRevoked;
    }

    struct VerificationRequest {
        bytes32 documentId;
        address requester;
        address verifier;
        bool isVerified;
        bool isRejected;
        string verificationNotes;
        uint256 timestamp;
    }

    // Mappings
    mapping(address => UserRole) public userRoles;
    mapping(bytes32 => Document) public documents;
    mapping(bytes32 => VerificationRequest) public verificationRequests;
    mapping(address => bytes32[]) public userDocuments; // user address => array of document IDs
    mapping(address => bytes32[]) public institutionDocuments; // institution address => array of document IDs
    mapping(bytes32 => bytes32[]) public documentVerifications; // documentId => array of verification request IDs

    // Events
    event UserRegistered(address indexed user, UserRole role);
    event DocumentIssued(bytes32 indexed documentId, address indexed issuer, address indexed recipient, string documentHash);
    event DocumentRevoked(bytes32 indexed documentId, address indexed issuer);
    event VerificationRequested(bytes32 indexed requestId, bytes32 indexed documentId, address requester);
    event VerificationCompleted(bytes32 indexed requestId, bool isVerified, string notes);
    event RoleUpdated(address indexed user, UserRole newRole);

    modifier onlyOwner() {
        require(msg.sender == owner, "Caller is not the owner");
        _;
    }

    modifier onlyRole(UserRole requiredRole) {
        require(userRoles[msg.sender] == requiredRole, "Insufficient permissions");
        _;
    }

    modifier documentExists(bytes32 _documentId) {
        require(documents[_documentId].issuer != address(0), "Document does not exist");
        _;
    }

    modifier validAddress(address _address) {
        require(_address != address(0), "Invalid address");
        _;
    }

    constructor() {
        owner = msg.sender;
        userRoles[msg.sender] = UserRole.INSTITUTION; // Owner is also an institution by default
        emit UserRegistered(msg.sender, UserRole.INSTITUTION);
    }

    /**
     * @dev Registers a user with a specific role
     * @param _user Address of the user to register
     * @param _role Role to assign (USER, VERIFIER, or INSTITUTION)
     */
    function registerUser(address _user, UserRole _role) public onlyOwner validAddress(_user) {
        require(_role != UserRole.NONE, "Invalid role");
        userRoles[_user] = _role;
        emit UserRegistered(_user, _role);
    }

    /**
     * @dev Updates a user's role
     * @param _user Address of the user to update
     * @param _newRole New role to assign
     */
    function updateUserRole(address _user, UserRole _newRole) public onlyOwner validAddress(_user) {
        require(_newRole != UserRole.NONE, "Invalid role");
        userRoles[_user] = _newRole;
        emit RoleUpdated(_user, _newRole);
    }

    /**
     * @dev Issues a new document certificate
     * @param _documentId The unique identifier for the document
     * @param _recipient Address of the document recipient
     * @param _documentHash The SHA-256 hash of the document
     * @param _metadataURI URI pointing to document metadata (IPFS, etc.)
     * @param _expirationDays Number of days until the document expires (0 for no expiration)
     * @return documentId The ID of the issued document
     */
    function issueDocument(
        bytes32 _documentId,
        address _recipient,
        string memory _documentHash,
        string memory _metadataURI,
        uint256 _expirationDays
    ) public onlyRole(UserRole.INSTITUTION) validAddress(_recipient) returns (bytes32) {
        require(bytes(_documentHash).length > 0, "Document hash cannot be empty");
        require(documents[_documentId].issuer == address(0), "Document already issued");
        
        uint256 expiration = _expirationDays > 0 
            ? block.timestamp + (_expirationDays * 1 days)
            : 0;

        Document memory newDocument = Document({
            issuer: msg.sender,
            recipient: _recipient,
            documentHash: _documentHash,
            metadataURI: _metadataURI,
            timestamp: block.timestamp,
            expirationDate: expiration,
            isValid: true,
            isRevoked: false
        });

        documents[_documentId] = newDocument;
        userDocuments[_recipient].push(_documentId);
        institutionDocuments[msg.sender].push(_documentId);
        documentCount++;

        emit DocumentIssued(_documentId, msg.sender, _recipient, _documentHash);
        return _documentId;
    }

    /**
     * @dev Requests verification of a document
     * @param _documentId The ID of the document to verify
     * @param _verifier Address of the verifier
     * @return requestId The ID of the verification request
     */
    function requestVerification(
        bytes32 _documentId,
        address _verifier
    ) public documentExists(_documentId) validAddress(_verifier) returns (bytes32) {
        require(userRoles[_verifier] == UserRole.VERIFIER, "Not a valid verifier");
        require(documents[_documentId].recipient == msg.sender, "Not the document owner");
        
        bytes32 requestId = keccak256(abi.encodePacked(_documentId, msg.sender, _verifier, block.timestamp));
        
        VerificationRequest memory newRequest = VerificationRequest({
            documentId: _documentId,
            requester: msg.sender,
            verifier: _verifier,
            isVerified: false,
            isRejected: false,
            verificationNotes: "",
            timestamp: block.timestamp
        });
        
        verificationRequests[requestId] = newRequest;
        documentVerifications[_documentId].push(requestId);
        
        emit VerificationRequested(requestId, _documentId, msg.sender);
        return requestId;
    }

    /**
     * @dev Completes a verification request
     * @param _requestId The ID of the verification request
     * @param _isVerified Whether the document was verified
     * @param _notes Additional notes about the verification
     */
    function completeVerification(
        bytes32 _requestId,
        bool _isVerified,
        string memory _notes
    ) public {
        VerificationRequest storage request = verificationRequests[_requestId];
        require(request.verifier == msg.sender, "Not the assigned verifier");
        require(!request.isVerified && !request.isRejected, "Request already processed");
        
        if (_isVerified) {
            request.isVerified = true;
        } else {
            request.isRejected = true;
        }
        
        request.verificationNotes = _notes;
        
        emit VerificationCompleted(_requestId, _isVerified, _notes);
    }

    /**
     * @dev Revokes a previously issued document
     * @param _documentId The ID of the document to revoke
     */
    function revokeDocument(bytes32 _documentId) public documentExists(_documentId) {
        Document storage document = documents[_documentId];
        require(document.issuer == msg.sender, "Not the document issuer");
        require(!document.isRevoked, "Document already revoked");
        
        document.isRevoked = true;
        document.isValid = false;
        
        emit DocumentRevoked(_documentId, msg.sender);
    }

    /**
     * @dev Retrieves a document by its ID
     * @param _documentId The ID of the document to retrieve
     * @return document The Document struct
     */
    function getDocument(bytes32 _documentId) public view documentExists(_documentId) returns (Document memory) {
        return documents[_documentId];
    }

    /**
     * @dev Gets all document IDs for a user
     * @param _user Address of the user
     * @return Array of document IDs
     */
    function getUserDocuments(address _user) public view validAddress(_user) returns (bytes32[] memory) {
        return userDocuments[_user];
    }

    /**
     * @dev Gets all document IDs issued by an institution
     * @param _institution Address of the institution
     * @return Array of document IDs
     */
    function getInstitutionDocuments(address _institution) public view validAddress(_institution) returns (bytes32[] memory) {
        return institutionDocuments[_institution];
    }

    /**
     * @dev Gets all verification requests for a document
     * @param _documentId The ID of the document
     * @return Array of verification request IDs
     */
    function getDocumentVerifications(bytes32 _documentId) public view documentExists(_documentId) returns (bytes32[] memory) {
        return documentVerifications[_documentId];
    }

    /**
     * @dev Gets verification request details
     * @param _requestId The ID of the verification request
     * @return Verification request details
     */
    function getVerificationRequest(bytes32 _requestId) public view returns (VerificationRequest memory) {
        return verificationRequests[_requestId];
    }

    /**
     * @dev Checks if a document is valid (not revoked and not expired)
     * @param _documentId The ID of the document to check
     * @return True if the document is valid, false otherwise
     */
    function isDocumentValid(bytes32 _documentId) public view returns (bool) {
        Document memory doc = documents[_documentId];
        if (doc.issuer == address(0)) return false;
        if (doc.isRevoked || !doc.isValid) return false;
        if (doc.expirationDate > 0 && block.timestamp > doc.expirationDate) return false;
        return true;
    }
}
